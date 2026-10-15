const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('ffmpeg-static');
const PDFDocument = require('pdfkit');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

if (ffmpegInstaller) {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
}

const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint de conversión local inteligente
app.post('/convert', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    const inputPath = req.file.path;
    const targetFormat = req.body.format.toLowerCase();
    const originalExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const originalName = path.parse(req.file.originalname).name;
    const outputFileName = `${originalName}_convertido.${targetFormat}`;
    const outputPath = path.join(outputDir, outputFileName);

    // 1. CONVERSIÓN DE IMAGEN A PDF
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (imageExtensions.includes(originalExt) && targetFormat === 'pdf') {
        try {
            const doc = new PDFDocument({ autoFirstPage: false });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            const imageSize = doc.openImage(inputPath);
            doc.addPage({ size: [imageSize.width, imageSize.height] });
            doc.image(inputPath, 0, 0, { width: imageSize.width, height: imageSize.height });
            doc.end();

            stream.on('finish', () => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                res.json({ success: true, downloadUrl: `/download/${outputFileName}` });
            });

            stream.on('error', (err) => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                res.status(500).json({ error: 'Error al generar el PDF: ' + err.message });
            });
            return;
        } catch (err) {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            return res.status(500).json({ error: 'Error procesando la imagen a PDF: ' + err.message });
        }
    }

    // 2. CONVERSIÓN DE DOCX A TXT (Uso de mammoth)
    if (originalExt === 'docx' && targetFormat === 'txt') {
        try {
            const result = await mammoth.extractRawText({ path: inputPath });
            fs.writeFileSync(outputPath, result.value, 'utf8');
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            return res.json({ success: true, downloadUrl: `/download/${outputFileName}` });
        } catch (err) {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            return res.status(500).json({ error: 'Error convirtiendo DOCX a TXT: ' + err.message });
        }
    }

    // 3. CONVERSIÓN MULTIMEDIA GENERAL (Vídeo, Audio, Imágenes cruzadas con FFmpeg)
    ffmpeg(inputPath)
        .output(outputPath)
        .on('end', () => {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            res.json({ success: true, downloadUrl: `/download/${outputFileName}` });
        })
        .on('error', (err) => {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            res.status(500).json({ error: 'Error durante la conversión local: ' + err.message });
        })
        .run();
});

// Ruta para descargar el archivo convertido
app.get('/download/:filename', (req, res) => {
    const file = path.join(outputDir, req.params.filename);
    res.download(file, (err) => {
        if (!err && fs.existsSync(file)) {
            setTimeout(() => fs.unlinkSync(file), 10000); 
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor local open source corriendo en http://localhost:${port}`);
});