let audioInstance = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // 1. Inject Page Transition Overlay
  const overlay = document.createElement("div");
  overlay.className = "page-transition-overlay";
  document.body.prepend(overlay);

  // 2. Inject Ambient Particle Layer if not present
  let ambientLayer = document.querySelector(".ambient");
  if (!ambientLayer) {
    ambientLayer = document.createElement("div");
    ambientLayer.className = "ambient";
    ambientLayer.setAttribute("aria-hidden", "true");
    ambientLayer.innerHTML = `
      <span class="aura aura-one"></span>
      <span class="aura aura-two"></span>
      <span class="aura aura-three"></span>
      <div id="particleLayer" class="particle-layer"></div>
    `;
    document.body.appendChild(ambientLayer);
  }

  // 3. Inject Progress Indicator (for chapters 1 to 6)
  const mainJourney = document.querySelector("main.journey");
  if (mainJourney) {
    const chapter = mainJourney.getAttribute("data-chapter");
    if (chapter && parseInt(chapter) >= 1 && parseInt(chapter) <= 6) {
      const progressPill = document.createElement("div");
      progressPill.className = "progress-indicator";
      progressPill.innerHTML = `Chapter ${chapter} of 7 <span aria-hidden="true" class="progress-heart-container" style="color: var(--pink); display: inline-flex; align-items: center; margin-left: 0.3rem; vertical-align: middle; width: 0.95rem; height: 0.95rem;"><svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>`;
      document.body.appendChild(progressPill);
    }
  }

  // 4. Initialize Background Music
  initBackgroundMusic();

  // 5. Spawn Ambient Particles
  createAmbientParticles();

  // 6. Trigger Page Load Animations
  setTimeout(() => {
    overlay.classList.add("is-loaded");
    if (mainJourney) {
      mainJourney.classList.add("is-active");
    }
  }, 100);
});

// Particle Spawning Logic
function createAmbientParticles() {
  const particleLayer = document.getElementById("particleLayer");
  if (!particleLayer) return;

  const symbols = ["✦", "♡", "·", "✧"]; // Removed standard colorful emoji ❤️, replaced with outlines/sparkles!
  const fragment = document.createDocumentFragment();
  const count = window.innerWidth < 600 ? 18 : 35; // Optimize particle count for mobile performance

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.textContent = symbols[index % symbols.length];
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${12 + Math.random() * 15}s`;
    particle.style.animationDelay = `${Math.random() * -20}s`;
    particle.style.opacity = `${0.2 + Math.random() * 0.5}`;
    particle.style.fontSize = `${0.6 + Math.random() * 0.9}rem`;
    fragment.appendChild(particle);
  }

  particleLayer.appendChild(fragment);
}

// Background Music Persistence Logic
const MUSIC_TARGET_VOLUME = 0.6;
const MUSIC_FADE_IN_MS = 12000; // slow, gentle start

function initBackgroundMusic() {
  if (typeof BirthdayConfig === "undefined" || !BirthdayConfig.musicUrl) return;

  const path = window.location.pathname;
  const isFirstPage = path.includes("index.html") || path === "/" || path === "" || path.endsWith("/");
  const isEndingPage = path.includes("ending.html");

  // Opening page always starts the song fresh from the beginning
  if (isFirstPage) {
    sessionStorage.setItem("musicPlaying", "true");
    sessionStorage.setItem("musicTime", "0");
    sessionStorage.setItem("musicVolume", "0");
    sessionStorage.removeItem("endingJumped");
  }

  let audio = document.getElementById("global-background-music");
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "global-background-music";
    audio.loop = true; // after the song finishes it starts again from the beginning
    audio.preload = "auto";
    audio.src = BirthdayConfig.musicUrl;
    document.body.appendChild(audio);
  }
  audioInstance = audio;

  // After the candle: jump to the chosen part of the song once
  const endingStart = BirthdayConfig.endingMusicStart;
  const jumpToEnding = isEndingPage && typeof endingStart === "number" && !sessionStorage.getItem("endingJumped");

  if (jumpToEnding) {
    audio.currentTime = endingStart;
    sessionStorage.setItem("endingJumped", "true");
    sessionStorage.setItem("musicVolume", "0");
  } else {
    const savedTime = parseFloat(sessionStorage.getItem("musicTime") || "0");
    if (savedTime) audio.currentTime = savedTime;
  }

  const savedVolume = parseFloat(sessionStorage.getItem("musicVolume") || "0");
  audio.volume = Math.min(savedVolume, MUSIC_TARGET_VOLUME);

  audio.addEventListener("timeupdate", () => {
    sessionStorage.setItem("musicTime", audio.currentTime);
  });

  // Continue (or start) the slow fade-in once playback actually begins
  audio.addEventListener("play", () => {
    if (audio.volume < MUSIC_TARGET_VOLUME) {
      const remaining = (MUSIC_TARGET_VOLUME - audio.volume) / MUSIC_TARGET_VOLUME;
      const duration = jumpToEnding ? 4000 : MUSIC_FADE_IN_MS * remaining;
      fadeVolume(audio.volume, MUSIC_TARGET_VOLUME, Math.max(duration, 500));
    }
  });

  if (sessionStorage.getItem("musicPlaying") === "true") {
    // Browsers need a tap before sound can play, so on the first page wait for her first tap
    attemptPlayMusic(isFirstPage);
  }
}

function startGlobalMusic() {
  sessionStorage.setItem("musicPlaying", "true");
  if (audioInstance) {
    attemptPlayMusic();
  }
}

function attemptPlayMusic(forceWait = false) {
  if (!audioInstance) return;

  // Enhance iOS compatibility configurations
  audioInstance.setAttribute("playsinline", "true");
  audioInstance.setAttribute("webkit-playsinline", "true");

  const tryPlay = () => {
    audioInstance.play()
      .then(() => {
        console.log("Playback successfully started/unlocked on interaction!");
        removeUnlockListeners();
      })
      .catch((error) => {
        console.log("Playback attempt blocked: ", error.message);
        // Playback failed, listeners remain attached to retry on next user action
      });
  };

  const unlockEvents = ["click", "touchstart", "pointerdown", "keydown", "scroll"];

  const handleInteraction = () => {
    tryPlay();
  };

  const removeUnlockListeners = () => {
    unlockEvents.forEach((evt) => {
      document.removeEventListener(evt, handleInteraction, { passive: true });
    });
  };

  const addUnlockListeners = () => {
    unlockEvents.forEach((evt) => {
      document.addEventListener(evt, handleInteraction, { passive: true });
    });
  };

  if (forceWait) {
    console.log("Audio waiting for first interaction gesture.");
    addUnlockListeners();
  } else {
    // Attempt playing immediately (standard unlock restore)
    audioInstance.play()
      .then(() => {
        console.log("Audio played immediately successfully!");
      })
      .catch((error) => {
        console.log("Autoplay blocked immediately. Registering unlock gesture handlers: ", error.message);
        addUnlockListeners();
      });
  }
}

// Page Transition Helper
function navigateWithTransition(url) {
  const overlay = document.querySelector(".page-transition-overlay");
  if (overlay) {
    overlay.classList.remove("is-loaded");
    overlay.classList.add("is-exiting");
  }

  if (audioInstance) {
    sessionStorage.setItem("musicTime", audioInstance.currentTime);
  }

  setTimeout(() => {
    window.location.href = url;
  }, 780);
}

// Volume fade transitions (for playing voice notes cleanly)
function fadeOutMusic(duration = 1000) {
  if (!audioInstance) return;
  const startVolume = audioInstance.volume;
  const interval = 50;
  const steps = duration / interval;
  const delta = startVolume / steps;

  const timer = setInterval(() => {
    if (audioInstance.volume > delta) {
      audioInstance.volume -= delta;
    } else {
      audioInstance.volume = 0;
      audioInstance.pause();
      sessionStorage.setItem("musicPlaying", "false");
      clearInterval(timer);
    }
  }, interval);
}

function fadeInMusic(targetVolume, duration = 1000) {
  if (!audioInstance) return;

  if (targetVolume === undefined) {
    targetVolume = MUSIC_TARGET_VOLUME;
  }

  audioInstance.volume = 0;
  sessionStorage.setItem("musicPlaying", "true");
  audioInstance.play().then(() => {
    const interval = 50;
    const steps = duration / interval;
    const delta = targetVolume / steps;

    const timer = setInterval(() => {
      if (audioInstance.volume < targetVolume - delta) {
        audioInstance.volume += delta;
      } else {
        audioInstance.volume = targetVolume;
        clearInterval(timer);
      }
    }, interval);
  }).catch(e => console.log(e));
}

// Volume fade progression helper (linear transition between two levels)
function fadeVolume(start, end, duration = 2500) {
  if (!audioInstance) return;
  const interval = 50;
  const steps = duration / interval;
  const delta = (end - start) / steps;
  let currentVolume = start;
  audioInstance.volume = currentVolume;

  const timer = setInterval(() => {
    currentVolume += delta;
    if ((delta > 0 && currentVolume >= end) || (delta < 0 && currentVolume <= end)) {
      audioInstance.volume = end;
      clearInterval(timer);
    } else {
      audioInstance.volume = Math.max(0, Math.min(1, currentVolume));
    }
    sessionStorage.setItem("musicVolume", audioInstance.volume);
  }, interval);
}
