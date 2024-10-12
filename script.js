let audioContext;
let analyser;
let microphone;
let dataArray;
let isAnalyzing = false;
let rafId;
let maxFrequency = 0;

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const frequencyDisplay = document.getElementById('frequency');
const maxFrequencyDisplay = document.getElementById('max-frequency');
const statusElem = document.getElementById('status');

// Function to detect the fundamental frequency from the audio data
function autoCorrelate(buffer, sampleRate) {
    let size = buffer.length;
    let maxSamples = Math.floor(size / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;
    let foundGoodCorrelation = false;
    let correlationThreshold = 0.9;
    let correlations = new Array(maxSamples);

    for (let i = 0; i < size; i++) {
        let val = buffer[i];
        rms += val * val;
    }

    rms = Math.sqrt(rms / size);

    if (rms < 0.01) {
        return -1; // Not enough signal to process
    }

    let lastCorrelation = 1;

    for (let offset = 0; offset < maxSamples; offset++) {
        let correlation = 0;

        for (let i = 0; i < maxSamples; i++) {
            correlation += Math.abs(buffer[i] - buffer[i + offset]);
        }

        correlation = 1 - (correlation / maxSamples);
        correlations[offset] = correlation;

        if (correlation > correlationThreshold && correlation > lastCorrelation) {
            foundGoodCorrelation = true;

            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        } else if (foundGoodCorrelation) {
            let fundamentalFreq = sampleRate / bestOffset;
            return fundamentalFreq;
        }

        lastCorrelation = correlation;
    }

    if (bestCorrelation > correlationThreshold) {
        return sampleRate / bestOffset;
    }

    return -1;
}

// Function to update frequency based on audio input
function updateFrequency() {
    if (!isAnalyzing) return;

    analyser.getFloatTimeDomainData(dataArray);
    const frequency = autoCorrelate(dataArray, audioContext.sampleRate);

    if (frequency !== -1) {
        frequencyDisplay.textContent = Math.round(frequency);

        if (frequency > maxFrequency) {
            maxFrequency = frequency;
            maxFrequencyDisplay.textContent = Math.round(maxFrequency);
        }
    } else {
        frequencyDisplay.textContent = '0';
    }

    rafId = requestAnimationFrame(updateFrequency);
}

// Start recording and analyzing the audio
startBtn.addEventListener('click', async () => {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        dataArray = new Float32Array(analyser.fftSize);

        isAnalyzing = true;
        maxFrequency = 0; // Reset max frequency when starting
        statusElem.textContent = 'Analyzing voice frequency...';
        startBtn.disabled = true;
        stopBtn.disabled = false;

        updateFrequency();
    } catch (error) {
        statusElem.textContent = `Error: ${error.message}`;
    }
});

// Stop the audio analysis
stopBtn.addEventListener('click', () => {
    if (audioContext) {
        audioContext.close();
    }

    cancelAnimationFrame(rafId);
    isAnalyzing = false;
    statusElem.textContent = 'Analysis stopped.';
    startBtn.disabled = false;
    stopBtn.disabled = true;
});
