let selectedFile = null;

// Catálogo completo de tus formatos favoritos organizados por categorías
const formatCategories = {
    document: {
        label: "📄 Formatos de Documento",
        formats: ['pdf', 'txt', 'docx', 'pptx', 'epub']
    },
    video: {
        label: "🎥 Formatos de Vídeo",
        formats: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv']
    },
    audio: {
        label: "🎵 Formatos de Audio",
        formats: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
    },
    image: {
        label: "🖼️ Formatos de Imagen",
        formats: ['jpg', 'jpeg', 'png', 'webp']
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, false);
});

function handleFileSelect(file) {
    if (!file) return;
    selectedFile = file;
    
    document.getElementById('dropZoneText').textContent = `📄 Archivo listo: ${file.name}`;
    
    // Extraer extensión del archivo original
    const fileExtension = file.name.split('.').pop().toLowerCase();

    const outputFormatSelect = document.getElementById('outputFormat');
    outputFormatSelect.innerHTML = '<option value="">-- Selecciona el formato de salida --</option>';

    // Determinar qué grupos mostrar y qué restricciones aplicar según el tipo de archivo subido
    let groupsToShow = [];
    let excludedFormats = [];

    if (['pdf', 'txt', 'docx', 'pptx', 'epub'].includes(fileExtension)) {
        groupsToShow = ['document', 'image'];
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
        // SI ES IMAGEN: Solo permitimos otras imágenes y estrictamente PDF como documento (se omiten TXT, DOCX, PPTX, EPUB)
        groupsToShow = ['image', 'document'];
        excludedFormats = ['txt', 'docx', 'pptx', 'epub'];
    } else if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'].includes(fileExtension)) {
        groupsToShow = ['video', 'audio', 'image'];
    } else if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(fileExtension)) {
        groupsToShow = ['audio', 'video'];
    } else {
        groupsToShow = ['document', 'image', 'video', 'audio'];
    }

    // Construir dinámicamente las opciones omitiendo el formato original y las exclusiones de imagen
    groupsToShow.forEach(groupKey => {
        const groupInfo = formatCategories[groupKey];
        if (!groupInfo) return;

        const optgroup = document.createElement('optgroup');
        optgroup.label = groupInfo.label;

        let hasValidOptions = false;

        groupInfo.formats.forEach(fmt => {
            // Omitir el formato original y los formatos excluidos para este tipo de archivo
            if (fmt !== fileExtension && !excludedFormats.includes(fmt)) {
                const option = document.createElement('option');
                option.value = fmt;
                option.textContent = fmt.toUpperCase();
                optgroup.appendChild(option);
                hasValidOptions = true;
            }
        });

        if (hasValidOptions) {
            outputFormatSelect.appendChild(optgroup);
        }
    });

    outputFormatSelect.disabled = false;
    document.getElementById('convertBtn').disabled = false;
    showStatus("Archivo analizado. Selecciona tu formato de salida deseado.", "info");
}

async function startLocalConversion() {
    const formatSelect = document.getElementById('outputFormat');
    const targetFormat = formatSelect.value;
    const convertBtn = document.getElementById('convertBtn');

    if (!selectedFile || !targetFormat) {
        alert("Por favor selecciona un formato de salida válido.");
        return;
    }

    convertBtn.disabled = true;
    showStatus("Procesando conversión local (esto puede tardar unos segundos)...", "info");

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('format', targetFormat);

    try {
        const response = await fetch('http://localhost:3000/convert', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Error al procesar el archivo.");
        }

        showStatus(`¡Conversión completada con éxito!<br><a href="${data.downloadUrl}" class="result-link" download>Descargar Archivo</a>`, "success");
        convertBtn.disabled = false;

    } catch (error) {
        showStatus(error.message, "error");
        convertBtn.disabled = false;
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.className = type;
    statusDiv.innerHTML = message;
}