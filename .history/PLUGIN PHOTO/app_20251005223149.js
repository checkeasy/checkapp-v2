// Photo Comparative MVP
// Type hints via JSDoc for readability

/**
 * @typedef {{
 *  logement_id: string;
 *  rapport_id: string;
 *  pieces: Piece[];
 * }} PhotoModuleData
 * @typedef {{
 *  piece_id: string;
 *  nom: string;
 *  commentaire_ia?: string;
 *  checkin_pictures: { piece_id: string; url: string }[];
 *  etapes?: Etape[];
 * }} Piece
 * @typedef {{
 *  etape_id: string;
 *  task_name: string;
 *  consigne?: string;
 *  checking_picture?: string;
 * }} Etape
 * @typedef {{
 *  authToken?: string;
 *  uploadMode?: 'bubble'|'direct';
 *  endPoint?: string;
 *  maxResolution?: { width: number; height: number };
 * }} InitConfig
 */

const state = {
  config: /** @type {InitConfig} */({ uploadMode: 'bubble' }),
  environment: 'test', // 'test' or 'live'
  data: /** @type {PhotoModuleData|null} */(null),
  rapportList: /** @type {any[]|null} */(null),
  selectedRapportId: /** @type {string|null} */(null),
  selectedPieceId: /** @type {string|null} */(null),
  selectedRefIndex: 0,
  stream: /** @type {MediaStream|null} */(null),
  cameraFacingMode: 'environment', // 'environment' (rear) or 'user' (front)
  ghostOpacity: 0.5,
  showGrid: false,
  showHorizon: false,
  lastCaptureBlob: /** @type {Blob|null} */(null),
  lastCaptureMeta: /** @type {{width:number;height:number;orientation?:number}|null} */(null),
  // Parcours state
  parcoursMode: false,
  currentStepIndex: 0,
  completedSteps: /** @type {Set<string>} */(new Set()),
  parcoursStarted: false,
  // Track captured references: piece_id + ref_index
  capturedRefs: /** @type {Set<string>} */(new Set()),
  // Photo list view state
  showingPhotoList: false,
  captureMode: false, // fullscreen capture mode
  reviewMode: false, // reviewing a captured photo
  reviewingRefIndex: -1, // which ref is being reviewed
  capturedPhotos: /** @type {Map<string, {blob: Blob, dataUrl: string, takenAt: string}>} */(new Map()),
};

const dom = {
  root: /** @type {HTMLElement} */(document.getElementById('viewRoot')),
  back: /** @type {HTMLButtonElement} */(document.getElementById('btnBack')),
  install: /** @type {HTMLButtonElement} */(document.getElementById('btnInstall')),
  contextLabel: /** @type {HTMLElement} */(document.getElementById('contextLabel')),
  toast: /** @type {HTMLElement} */(document.getElementById('toast')),
};

// Messaging protocol
const parentOriginAllowlist = new Set(); // empty means accept same-origin only; will allow first known origin
let parentOrigin = null;

function postToParent(type, payload) {
  try {
    const msg = { type, payload };
    if (window.parent) {
      window.parent.postMessage(msg, '*');
    }
  } catch (e) {
    // no-op
  }
}

// Toast
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  setTimeout(() => dom.toast.classList.remove('show'), 2200);
}

// Data validation
function isValidUrl(url) {
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

/**
 * @param {any} input
 * @returns {input is PhotoModuleData}
 */
function validateData(input) {
  if (!input || typeof input !== 'object') return false;
  if (!Array.isArray(input.pieces) || input.pieces.length === 0) return false;
  for (const p of input.pieces) {
    if (!p || typeof p !== 'object') return false;
    if (typeof p.piece_id !== 'string' || typeof p.nom !== 'string') return false;
    if (!Array.isArray(p.checkin_pictures) || p.checkin_pictures.length === 0) return false;
    for (const cp of p.checkin_pictures) {
      if (typeof cp.url !== 'string' || !isValidUrl(cp.url)) return false;
    }
  }
  return true;
}

function setContextLabel() {
  if (!state.data) { dom.contextLabel.textContent = ''; return; }
  dom.contextLabel.textContent = `Rapport ${state.data.rapport_id} · Logement ${state.data.logement_id}`;
}

function emitError(code, message, context) {
  postToParent('photo.error', { code, message, context });
  showToast(message);
}

// Views
function render() {
  dom.root.innerHTML = '';
  
  // If we have specific data already (from URL or postMessage), skip rapport selection
  if (state.data && state.data.pieces && state.data.pieces.length > 0) {
    setContextLabel();
    
    if (state.parcoursMode && state.parcoursStarted) {
      // Parcours mode: sequential navigation
      if (!state.selectedPieceId) {
        // Start or continue parcours
        const currentPiece = getCurrentParcoursPiece();
        if (currentPiece) {
          state.selectedPieceId = currentPiece.piece_id;
          renderCompare();
        } else {
          // Parcours completed
          renderParcoursComplete();
        }
      } else {
        renderCompare();
      }
    } else if (!state.selectedPieceId) {
      // Free mode: show grid or parcours choice
      renderHome();
    } else if (state.showingPhotoList && !state.captureMode) {
      // Show photo list for selected piece
      renderPhotoList();
    } else if (state.reviewMode) {
      // Show review interface for captured photo
      renderCapturedPhotoReview();
    } else {
      // Show capture interface
      renderCompare();
    }
    return;
  }
  
  // Otherwise show rapport selection or empty state
  if (!state.rapportList) {
    renderEmpty();
  } else {
    renderRapportSelector();
  }
}

function renderEmpty() {
  const wrap = document.createElement('div');
  wrap.className = 'empty';
  const p = document.createElement('p');
  p.textContent = 'Chargement...';
  wrap.appendChild(p);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.flexDirection = 'column';
  actions.style.gap = '12px';
  actions.style.alignItems = 'center';
  actions.style.marginTop = '16px';

  // Button to load rapport list from API
  const btnLoadRapports = document.createElement('button');
  btnLoadRapports.className = 'btn';
  btnLoadRapports.textContent = 'Charger la liste des rapports';
  btnLoadRapports.onclick = () => loadRapportList();
  actions.appendChild(btnLoadRapports);

  const divider = document.createElement('div');
  divider.textContent = '— ou —';
  divider.style.color = '#9aa3b2';
  divider.style.fontSize = '12px';
  actions.appendChild(divider);

  // Button to load source.json directly from app
  const btnLoadSource = document.createElement('button');
  btnLoadSource.className = 'btn secondary';
  btnLoadSource.textContent = 'Test avec source.json';
  btnLoadSource.onclick = () => loadFromUrl('./source.json');
  actions.appendChild(btnLoadSource);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.onchange = () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || ''));
        if (!validateData(json)) throw new Error('Données invalides');
        state.data = json; render();
      } catch (e) {
        emitError('REF_LOAD_FAILED', 'JSON invalide', { err: String(e) });
      }
    };
    reader.readAsText(file);
  };
  actions.appendChild(fileInput);

  wrap.appendChild(actions);
  dom.root.appendChild(wrap);
}

function renderRapportSelector() {
  dom.back.hidden = true;
  
  const wrap = document.createElement('div');
  wrap.className = 'rapport-selector';
  
  const header = document.createElement('div');
  header.style.marginBottom = '16px';
  const title = document.createElement('h2');
  title.textContent = 'Sélectionner un rapport';
  title.style.margin = '0 0 8px 0';
  title.style.fontSize = '20px';
  header.appendChild(title);
  
  const envBadge = document.createElement('span');
  envBadge.className = 'badge';
  envBadge.textContent = state.environment === 'test' ? '🧪 Test' : '🚀 Live';
  envBadge.style.backgroundColor = state.environment === 'test' ? '#2d3748' : '#2b6cb0';
  header.appendChild(envBadge);
  wrap.appendChild(header);

  if (!state.rapportList || state.rapportList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Aucun rapport disponible';
    wrap.appendChild(empty);
    dom.root.appendChild(wrap);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';
  
  for (const rapport of state.rapportList) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cursor = 'pointer';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = rapport.Titre || rapport['Logement Titre'] || 'Sans titre';
    card.appendChild(titleEl);
    
    const meta = document.createElement('div');
    meta.className = 'meta';
    const dateEntree = rapport['Date Entrée'] ? new Date(rapport['Date Entrée']).toLocaleDateString('fr-FR') : '';
    const logement = rapport.Logement || '';
    meta.textContent = `${logement}${dateEntree ? ' • ' + dateEntree : ''}`;
    card.appendChild(meta);
    
    const footer = document.createElement('div');
    footer.className = 'footer';
    
    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge';
    const statut = rapport.Statut || 'En cours';
    statusBadge.textContent = statut;
    if (statut.toLowerCase().includes('terminé') || statut.toLowerCase().includes('complete')) {
      statusBadge.classList.add('red');
    }
    footer.appendChild(statusBadge);
    
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Ouvrir';
    btn.onclick = (e) => {
      e.stopPropagation();
      selectRapport(rapport);
    };
    footer.appendChild(btn);
    
    card.appendChild(footer);
    card.onclick = () => selectRapport(rapport);
    grid.appendChild(card);
  }
  
  wrap.appendChild(grid);
  dom.root.appendChild(wrap);
}

function renderHome() {
  // Show back button if we came from rapport selection
  if (state.rapportList && state.selectedRapportId) {
    dom.back.hidden = false;
    dom.back.onclick = () => {
      resetParcours();
      state.data = null;
      state.selectedRapportId = null;
      state.selectedPieceId = null;
      render();
    };
  } else {
    dom.back.hidden = true;
  }

  const wrap = document.createElement('div');
  wrap.className = 'home-wrapper';

  // Mode selection
  const modeSection = document.createElement('div');
  modeSection.className = 'mode-selection';
  
  const title = document.createElement('h2');
  title.textContent = 'Choisir le mode de capture';
  title.style.margin = '0 0 16px 0';
  title.style.fontSize = '18px';
  modeSection.appendChild(title);

  const modeGrid = document.createElement('div');
  modeGrid.style.display = 'grid';
  modeGrid.style.gridTemplateColumns = '1fr 1fr';
  modeGrid.style.gap = '12px';
  modeGrid.style.marginBottom = '24px';

  // Parcours mode card
  const parcoursCard = document.createElement('div');
  parcoursCard.className = 'card mode-card';
  parcoursCard.style.cursor = 'pointer';
  
  const parcoursIcon = document.createElement('div');
  parcoursIcon.textContent = '🎯';
  parcoursIcon.style.fontSize = '24px';
  parcoursIcon.style.marginBottom = '8px';
  parcoursCard.appendChild(parcoursIcon);
  
  const parcoursTitle = document.createElement('h3');
  parcoursTitle.textContent = 'Mode Parcours';
  parcoursTitle.style.fontSize = '14px';
  parcoursCard.appendChild(parcoursTitle);
  
  const parcoursMeta = document.createElement('div');
  parcoursMeta.className = 'meta';
  const availablePieces = state.data.pieces.filter(p => p.checkin_pictures && p.checkin_pictures.length > 0);
  parcoursMeta.textContent = `${availablePieces.length} étapes guidées`;
  parcoursCard.appendChild(parcoursMeta);
  
  parcoursCard.onclick = () => startParcours();
  modeGrid.appendChild(parcoursCard);

  // Free mode card  
  const freeCard = document.createElement('div');
  freeCard.className = 'card mode-card';
  freeCard.style.cursor = 'pointer';
  
  const freeIcon = document.createElement('div');
  freeIcon.textContent = '🔓';
  freeIcon.style.fontSize = '24px';
  freeIcon.style.marginBottom = '8px';
  freeCard.appendChild(freeIcon);
  
  const freeTitle = document.createElement('h3');
  freeTitle.textContent = 'Mode Libre';
  freeTitle.style.fontSize = '14px';
  freeCard.appendChild(freeTitle);
  
  const freeMeta = document.createElement('div');
  freeMeta.className = 'meta';
  freeMeta.textContent = 'Choisir les pièces';
  freeCard.appendChild(freeMeta);
  
  freeCard.onclick = () => renderFreeMode();
  modeGrid.appendChild(freeCard);

  modeSection.appendChild(modeGrid);
  wrap.appendChild(modeSection);
  dom.root.appendChild(wrap);
}

function renderFreeMode() {
  const grid = document.createElement('div');
  grid.className = 'grid';
  
  for (const piece of state.data.pieces) {
    const card = document.createElement('div');
    const hasRefs = Array.isArray(piece.checkin_pictures) && piece.checkin_pictures.length > 0;
    const isCompleted = isPieceFullyCompleted(piece.piece_id);
    const capturedCount = getPieceCapturedRefsCount(piece.piece_id);
    const hasPartialCaptures = capturedCount > 0 && !isCompleted;
    
    card.className = 'card' + 
      (hasRefs ? '' : ' disabled') + 
      (isCompleted ? ' completed' : '') +
      (hasPartialCaptures ? ' partial' : '');

    const title = document.createElement('h3');
    title.textContent = piece.nom + (isCompleted ? ' ✅' : hasPartialCaptures ? ' 📷' : '');
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (hasRefs) {
      meta.textContent = `${capturedCount}/${piece.checkin_pictures.length} capturée(s)`;
    } else {
      meta.textContent = 'Aucune référence';
    }
    card.appendChild(meta);

    const footer = document.createElement('div');
    footer.className = 'footer';
    const badge = document.createElement('span');
    badge.className = 'badge' + 
      (hasRefs ? 
        (isCompleted ? ' green' : hasPartialCaptures ? ' orange' : '') : 
        ' red');
    badge.textContent = hasRefs ? 
      (isCompleted ? 'Terminé' : hasPartialCaptures ? 'En cours' : 'Disponible') : 
      'Non disponible';
    footer.appendChild(badge);

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = isCompleted ? 'Reprendre' : 'Ouvrir';
    btn.disabled = !hasRefs;
    btn.onclick = () => {
      if (!hasRefs) return;
      state.selectedPieceId = piece.piece_id;
      state.selectedRefIndex = 0;
      state.parcoursMode = false;
      state.showingPhotoList = true;
      state.captureMode = false;
      postToParent('photo.piece.selected', { piece_id: piece.piece_id });
      render();
    };
    footer.appendChild(btn);

    card.appendChild(footer);
    grid.appendChild(card);
  }
  dom.root.appendChild(grid);
}

function renderPhotoList() {
  const piece = getSelectedPiece();
  if (!piece) { 
    state.selectedPieceId = null; 
    state.showingPhotoList = false;
    render(); 
    return; 
  }

  // Configure back button
  dom.back.hidden = false;
  dom.back.onclick = () => { 
    state.showingPhotoList = false;
    state.selectedPieceId = null; 
    render(); 
  };

  const wrap = document.createElement('div');
  wrap.className = 'photo-list-view';

  // Header
  const header = document.createElement('div');
  header.className = 'photo-list-header';
  
  const title = document.createElement('h2');
  title.textContent = piece.nom;
  title.style.margin = '0 0 8px 0';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'meta';
  const capturedCount = getPieceCapturedRefsCount(piece.piece_id);
  subtitle.textContent = `${capturedCount}/${piece.checkin_pictures.length} photo(s) capturée(s)`;
  header.appendChild(subtitle);

  wrap.appendChild(header);

  // Photo cards grid
  const photosGrid = document.createElement('div');
  photosGrid.className = 'photos-grid';

  piece.checkin_pictures.forEach((ref, index) => {
    const isCaptured = isRefCaptured(piece.piece_id, index);
    
    const photoCard = document.createElement('div');
    photoCard.className = 'photo-card' + (isCaptured ? ' captured' : '');

    const imageWrap = document.createElement('div');
    imageWrap.className = 'photo-preview';
    
    const img = document.createElement('img');
    img.src = ref.url;
    img.alt = `Référence ${index + 1}`;
    img.loading = 'lazy';
    imageWrap.appendChild(img);

    // Capture indicator overlay
    if (isCaptured) {
      const overlay = document.createElement('div');
      overlay.className = 'capture-overlay';
      overlay.innerHTML = '<div class="check-icon">✓</div>';
      imageWrap.appendChild(overlay);
    }

    photoCard.appendChild(imageWrap);

    const cardContent = document.createElement('div');
    cardContent.className = 'photo-card-content';
    
    const cardTitle = document.createElement('h4');
    cardTitle.textContent = `Photo ${index + 1}`;
    cardContent.appendChild(cardTitle);

    const status = document.createElement('div');
    status.className = 'photo-status';
    status.textContent = isCaptured ? 'Capturée ✓' : 'À capturer';
    status.style.color = isCaptured ? 'var(--accent-2)' : 'var(--muted)';
    cardContent.appendChild(status);

    photoCard.appendChild(cardContent);
    photosGrid.appendChild(photoCard);
  });

  wrap.appendChild(photosGrid);

  // Action button
  const actionSection = document.createElement('div');
  actionSection.className = 'photo-list-actions';
  
  const captureBtn = document.createElement('button');
  captureBtn.className = 'btn capture-btn';
  captureBtn.textContent = '📸 Prendre les photos';
  captureBtn.onclick = () => {
    state.captureMode = true;
    state.showingPhotoList = false;
    state.selectedRefIndex = 0;
    render();
  };
  
  actionSection.appendChild(captureBtn);
  wrap.appendChild(actionSection);

  dom.root.appendChild(wrap);
}

function renderCapturedPhotoReview() {
  const piece = getSelectedPiece();
  if (!piece || state.reviewingRefIndex === -1) { 
    state.reviewMode = false;
    render(); 
    return; 
  }

  // Configure back button
  dom.back.hidden = false;
  dom.back.onclick = () => { 
    state.reviewMode = false;
    state.captureMode = true;
    render(); 
  };

  const photoKey = getCapturedPhotoKey(piece.piece_id, state.reviewingRefIndex);
  const capturedPhoto = state.capturedPhotos.get(photoKey);
  const refPhoto = piece.checkin_pictures[state.reviewingRefIndex];

  if (!capturedPhoto || !refPhoto) {
    state.reviewMode = false;
    render();
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'captured-photo-review';

  // Header
  const header = document.createElement('div');
  header.className = 'review-header';
  
  const title = document.createElement('h2');
  title.textContent = `${piece.nom} - Photo ${state.reviewingRefIndex + 1}`;
  title.style.margin = '0 0 8px 0';
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'meta';
  subtitle.textContent = `Capturée le ${new Date(capturedPhoto.takenAt).toLocaleString('fr-FR')}`;
  header.appendChild(subtitle);

  wrap.appendChild(header);

  // Comparison view
  const comparison = document.createElement('div');
  comparison.className = 'review-comparison';

  const panelRef = document.createElement('div'); 
  panelRef.className = 'review-panel';
  const refImgWrap = document.createElement('div'); 
  refImgWrap.className = 'review-img';
  const refImg = document.createElement('img'); 
  refImg.src = refPhoto.url; 
  refImg.alt = 'Référence';
  refImgWrap.appendChild(refImg); 
  panelRef.appendChild(refImgWrap);
  const refTitle = document.createElement('h4'); 
  refTitle.textContent = 'Référence'; 
  panelRef.appendChild(refTitle);

  const panelCaptured = document.createElement('div'); 
  panelCaptured.className = 'review-panel';
  const capturedImgWrap = document.createElement('div'); 
  capturedImgWrap.className = 'review-img';
  const capturedImg = document.createElement('img'); 
  capturedImg.src = capturedPhoto.dataUrl; 
  capturedImg.alt = 'Photo capturée';
  capturedImgWrap.appendChild(capturedImg); 
  panelCaptured.appendChild(capturedImgWrap);
  const capturedTitle = document.createElement('h4'); 
  capturedTitle.textContent = 'Photo capturée'; 
  panelCaptured.appendChild(capturedTitle);

  comparison.appendChild(panelRef); 
  comparison.appendChild(panelCaptured);
  wrap.appendChild(comparison);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'review-actions';
  
  const btnKeep = document.createElement('button');
  btnKeep.className = 'btn secondary';
  btnKeep.textContent = 'Garder cette photo';
  btnKeep.onclick = () => {
    state.reviewMode = false;
    state.captureMode = true;
    render();
  };
  
  const btnRetake = document.createElement('button');
  btnRetake.className = 'btn';
  btnRetake.textContent = 'Reprendre la photo';
  btnRetake.onclick = () => {
    // Remove from captured state
    const refKey = `${piece.piece_id}_${state.reviewingRefIndex}`;
    state.capturedRefs.delete(refKey);
    state.capturedPhotos.delete(photoKey);
    
    // Go back to capture mode for this photo
    state.reviewMode = false;
    state.captureMode = true;
    state.selectedRefIndex = state.reviewingRefIndex;
    render();
  };
  
  actions.appendChild(btnKeep);
  actions.appendChild(btnRetake);
  wrap.appendChild(actions);

  dom.root.appendChild(wrap);
}

function getSelectedPiece() {
  if (!state.data || !state.selectedPieceId) return null;
  return state.data.pieces.find(p => p.piece_id === state.selectedPieceId) || null;
}

// Parcours management functions
function getAvailablePieces() {
  if (!state.data) return [];
  return state.data.pieces.filter(p => p.checkin_pictures && p.checkin_pictures.length > 0);
}

function getCurrentParcoursPiece() {
  const available = getAvailablePieces();
  return available[state.currentStepIndex] || null;
}

function startParcours() {
  state.parcoursMode = true;
  state.parcoursStarted = true;
  state.currentStepIndex = 0;
  state.selectedPieceId = null;
  render();
}

function resetParcours() {
  state.parcoursMode = false;
  state.parcoursStarted = false;
  state.currentStepIndex = 0;
  state.completedSteps.clear();
  state.capturedRefs.clear();
}

function restoreHeader() {
  const appHeader = document.querySelector('.app-header');
  if (appHeader) {
    appHeader.style.display = 'flex';
  }
}

function markStepCompleted(pieceId) {
  state.completedSteps.add(pieceId);
}

function markRefCaptured(pieceId, refIndex) {
  const refKey = `${pieceId}_${refIndex}`;
  state.capturedRefs.add(refKey);
}

function isRefCaptured(pieceId, refIndex) {
  const refKey = `${pieceId}_${refIndex}`;
  return state.capturedRefs.has(refKey);
}

function getPieceCapturedRefsCount(pieceId) {
  const piece = state.data?.pieces.find(p => p.piece_id === pieceId);
  if (!piece) return 0;
  
  let count = 0;
  for (let i = 0; i < piece.checkin_pictures.length; i++) {
    if (isRefCaptured(pieceId, i)) count++;
  }
  return count;
}

function isPieceFullyCompleted(pieceId) {
  const piece = state.data?.pieces.find(p => p.piece_id === pieceId);
  if (!piece || !piece.checkin_pictures) return false;
  
  return getPieceCapturedRefsCount(pieceId) === piece.checkin_pictures.length;
}

function getNextUncapturedRefIndex(pieceId) {
  const piece = state.data?.pieces.find(p => p.piece_id === pieceId);
  if (!piece || !piece.checkin_pictures) return -1;
  
  for (let i = 0; i < piece.checkin_pictures.length; i++) {
    if (!isRefCaptured(pieceId, i)) {
      return i;
    }
  }
  return -1; // All captured
}

function getCapturedPhotoKey(pieceId, refIndex) {
  return `${pieceId}_${refIndex}`;
}

function goToNextStep() {
  const available = getAvailablePieces();
  if (state.currentStepIndex < available.length - 1) {
    state.currentStepIndex++;
    state.selectedPieceId = null; // Will be set by render()
    return true;
  }
  return false; // Parcours completed
}

function goToPreviousStep() {
  if (state.currentStepIndex > 0) {
    state.currentStepIndex--;
    state.selectedPieceId = null; // Will be set by render()
    return true;
  }
  return false;
}

function renderProgressBar() {
  const available = getAvailablePieces();
  if (!state.parcoursMode || available.length === 0) return null;
  
  const progressWrap = document.createElement('div');
  progressWrap.className = 'progress-wrapper';
  
  const progressInfo = document.createElement('div');
  progressInfo.className = 'progress-info';
  progressInfo.innerHTML = `
    <span class="step-counter">Étape ${state.currentStepIndex + 1} sur ${available.length}</span>
    <span class="completion-rate">${state.completedSteps.size}/${available.length} terminées</span>
  `;
  progressWrap.appendChild(progressInfo);
  
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  
  for (let i = 0; i < available.length; i++) {
    const step = document.createElement('div');
    const piece = available[i];
    const isCompleted = state.completedSteps.has(piece.piece_id);
    const isCurrent = i === state.currentStepIndex;
    
    step.className = 'progress-step' + 
      (isCompleted ? ' completed' : '') + 
      (isCurrent ? ' current' : '');
    
    step.innerHTML = `
      <div class="step-dot">${isCompleted ? '✓' : (i + 1)}</div>
      <div class="step-label">${piece.nom}</div>
    `;
    
    progressBar.appendChild(step);
  }
  
  progressWrap.appendChild(progressBar);
  return progressWrap;
}

function renderParcoursComplete() {
  const wrap = document.createElement('div');
  wrap.className = 'parcours-complete';
  
  const icon = document.createElement('div');
  icon.className = 'complete-icon';
  icon.textContent = '🎉';
  wrap.appendChild(icon);
  
  const title = document.createElement('h2');
  title.textContent = 'Parcours terminé !';
  wrap.appendChild(title);
  
  const summary = document.createElement('div');
  summary.className = 'completion-summary';
  const available = getAvailablePieces();
  summary.innerHTML = `
    <p>Vous avez capturé ${state.completedSteps.size} photos sur ${available.length} pièces.</p>
    <div class="summary-list">
      ${available.map(piece => `
        <div class="summary-item ${state.completedSteps.has(piece.piece_id) ? 'completed' : 'incomplete'}">
          ${state.completedSteps.has(piece.piece_id) ? '✅' : '⏸️'} ${piece.nom}
        </div>
      `).join('')}
    </div>
  `;
  wrap.appendChild(summary);
  
  const actions = document.createElement('div');
  actions.className = 'actions';
  
  const btnRestart = document.createElement('button');
  btnRestart.className = 'btn secondary';
  btnRestart.textContent = 'Recommencer';
  btnRestart.onclick = () => {
    resetParcours();
    render();
  };
  
  const btnFinish = document.createElement('button');
  btnFinish.className = 'btn';
  btnFinish.textContent = 'Terminer';
  btnFinish.onclick = () => {
    resetParcours();
    state.selectedPieceId = null;
    render();
  };
  
  actions.appendChild(btnRestart);
  actions.appendChild(btnFinish);
  wrap.appendChild(actions);
  
  dom.root.appendChild(wrap);
}

function ensureStream() {
  if (state.stream) return Promise.resolve(state.stream);
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: state.cameraFacingMode },
      width: { ideal: 1920 }
    },
    audio: false
  })
    .then(s => { state.stream = s; return s; })
    .catch(err => { emitError('CAMERA_DENIED', 'Accès caméra refusé', { err: String(err) }); throw err; });
}

function stopStream() {
  if (state.stream) {
    for (const tr of state.stream.getTracks()) tr.stop();
    state.stream = null;
  }
}

function switchCamera() {
  // Toggle between front and rear camera
  state.cameraFacingMode = state.cameraFacingMode === 'environment' ? 'user' : 'environment';

  // Stop current stream
  stopStream();

  // Get the video element
  const video = document.querySelector('video');
  if (!video) return;

  // Start new stream with updated facing mode
  ensureStream()
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      console.error('Failed to switch camera:', err);
      // Revert to previous mode if switch fails
      state.cameraFacingMode = state.cameraFacingMode === 'environment' ? 'user' : 'environment';
    });
}

function renderCompare() {
  const piece = getSelectedPiece();
  if (!piece) { state.selectedPieceId = null; render(); return; }
  
  // Hide header in capture mode for fullscreen experience
  const appHeader = document.querySelector('.app-header');
  if (state.captureMode && appHeader) {
    appHeader.style.display = 'none';
  } else if (appHeader) {
    appHeader.style.display = 'flex';
  }
  
  // Configure back button
  dom.back.hidden = false;
  if (state.parcoursMode) {
    dom.back.onclick = () => {
      stopStream();
      if (goToPreviousStep()) {
        render();
      } else {
        // First step, go back to parcours start
        state.parcoursStarted = false;
        state.selectedPieceId = null;
        render();
      }
    };
  } else if (state.captureMode) {
    // Return to photo list
    dom.back.onclick = () => { 
      stopStream(); 
      state.captureMode = false;
      state.showingPhotoList = true;
      restoreHeader();
      render(); 
    };
  } else {
    dom.back.onclick = () => { stopStream(); state.selectedPieceId = null; render(); };
  }

  const container = document.createElement('div');
  container.className = state.captureMode ? 'camera-fullscreen' : 'compare';

  // Add progress bar if in parcours mode
  if (state.parcoursMode) {
    const progressBar = renderProgressBar();
    if (progressBar) {
      container.appendChild(progressBar);
    }
  }

  // Show ref selector strip only if NOT in capture mode
  if (!state.captureMode && piece.checkin_pictures.length > 1) {
    const strip = document.createElement('div');
    strip.className = 'ref-strip';
    piece.checkin_pictures.forEach((cp, idx) => {
      const t = document.createElement('div');
      const isActive = idx === state.selectedRefIndex;
      const isCaptured = isRefCaptured(piece.piece_id, idx);
      t.className = 'ref-thumb' + 
        (isActive ? ' active' : '') + 
        (isCaptured ? ' captured' : '');
      
      const img = document.createElement('img');
      img.src = cp.url;
      img.alt = 'Référence';
      t.appendChild(img);
      
      // Add capture indicator
      if (isCaptured) {
        const indicator = document.createElement('div');
        indicator.className = 'capture-indicator';
        indicator.textContent = '✓';
        t.appendChild(indicator);
      }
      
      t.onclick = () => { 
        state.selectedRefIndex = idx; 
        updateGhost(); 
        updateStripActive(strip, idx); 
      };
      strip.appendChild(t);
    });
    container.appendChild(strip);
  }

  const stage = document.createElement('div');
  stage.className = 'stage';

  const video = document.createElement('video');
  video.playsInline = true;
  video.autoplay = true;
  stage.appendChild(video);

  const ghost = document.createElement('img');
  ghost.style.opacity = String(state.ghostOpacity);
  ghost.style.pointerEvents = 'none';
  stage.appendChild(ghost);

  const gridOverlay = document.createElement('canvas');
  stage.appendChild(gridOverlay);

  container.appendChild(stage);

  if (state.captureMode) {
    // Native camera UI - floating capture button
    const captureOverlay = document.createElement('div');
    captureOverlay.className = 'capture-overlay-ui';

    // Back button for capture mode
    const backBtn = document.createElement('button');
    backBtn.className = 'capture-back-btn';
    backBtn.innerHTML = '×';
    backBtn.onclick = () => {
      stopStream();
      state.captureMode = false;
      state.showingPhotoList = true;
      render();
    };
    captureOverlay.appendChild(backBtn);

    // Camera flip button
    const flipBtn = document.createElement('button');
    flipBtn.className = 'camera-flip-btn';
    flipBtn.innerHTML = '⟲'; // Unicode circular arrow symbol
    flipBtn.title = 'Changer de caméra';
    flipBtn.onclick = () => {
      switchCamera();
    };
    captureOverlay.appendChild(flipBtn);
    
    // Custom Vertical Ghost Control
    const ghostControl = document.createElement('div');
    ghostControl.className = 'ghost-control';
    
    // Strong ghost icon (top)
    const strongIcon = document.createElement('span');
    strongIcon.className = 'ghost-icon';
    strongIcon.textContent = '👻';
    strongIcon.title = 'Fantôme fort';
    ghostControl.appendChild(strongIcon);
    
    // Custom vertical slider
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'vertical-slider-container';
    
    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'vertical-slider-track';
    
    const sliderThumb = document.createElement('div');
    sliderThumb.className = 'vertical-slider-thumb';
    
    sliderContainer.appendChild(sliderTrack);
    sliderContainer.appendChild(sliderThumb);
    ghostControl.appendChild(sliderContainer);
    
    // Weak ghost icon (bottom)
    const weakIcon = document.createElement('span');
    weakIcon.className = 'ghost-icon';
    weakIcon.textContent = '👻';
    weakIcon.title = 'Fantôme faible';
    ghostControl.appendChild(weakIcon);
    
    // Initialize thumb position
    const updateThumbPosition = (opacity) => {
      const percentage = opacity * 100;
      const containerRect = sliderContainer.getBoundingClientRect();
      const containerHeight = containerRect.height || sliderContainer.offsetHeight;
      const thumbPosition = containerHeight - (percentage / 100) * containerHeight;
      sliderThumb.style.top = `${thumbPosition}px`;
      
      // Update icons
      strongIcon.className = percentage > 50 ? 'ghost-icon active' : 'ghost-icon';
      weakIcon.className = percentage < 50 ? 'ghost-icon active' : 'ghost-icon';
    };
    
    // Set initial position (after elements are in DOM)
    setTimeout(() => updateThumbPosition(state.ghostOpacity), 0);
    
    // Handle mouse/touch interactions
    let isDragging = false;
    
    const handleMove = (clientY) => {
      const containerRect = sliderContainer.getBoundingClientRect();
      const relativeY = clientY - containerRect.top;
      const percentage = Math.max(0, Math.min(100, 100 - (relativeY / containerRect.height) * 100));
      
      state.ghostOpacity = percentage / 100;
      ghost.style.opacity = String(state.ghostOpacity);
      updateThumbPosition(state.ghostOpacity);
    };
    
    // Mouse events
    sliderContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      handleMove(e.clientY);
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        handleMove(e.clientY);
        e.preventDefault();
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Touch events with passive: false to allow preventDefault
    sliderContainer.addEventListener('touchstart', (e) => {
      isDragging = true;
      handleMove(e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        handleMove(e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });
    
    captureOverlay.appendChild(ghostControl);
    
    // Centered floating capture button
    const captureButton = document.createElement('button');
    captureButton.className = 'floating-capture-btn';
    captureButton.onclick = () => doCapture(video, ghost.src);
    captureOverlay.appendChild(captureButton);
    
    container.appendChild(captureOverlay);
  } else {
    // Regular controls for non-capture mode
    const controls = document.createElement('div');
    controls.className = 'controls';

    const rangeWrap = document.createElement('div');
    rangeWrap.className = 'range';
    const rangeLabel = document.createElement('span');
    rangeLabel.textContent = 'Ghost';
    const range = document.createElement('input');
    range.type = 'range'; range.min = '0'; range.max = '100'; range.value = String(Math.round(state.ghostOpacity * 100));
    range.oninput = () => { state.ghostOpacity = Number(range.value) / 100; ghost.style.opacity = String(state.ghostOpacity); };
    rangeWrap.appendChild(rangeLabel); rangeWrap.appendChild(range);

    const btnGrid = document.createElement('button');
    btnGrid.className = 'btn ghost';
    btnGrid.textContent = 'Grille';
    btnGrid.onclick = () => { state.showGrid = !state.showGrid; drawGrid(gridOverlay); };

    const btnHorizon = document.createElement('button');
    btnHorizon.className = 'btn ghost';
    btnHorizon.textContent = 'Horizon';
    btnHorizon.onclick = () => { state.showHorizon = !state.showHorizon; drawGrid(gridOverlay); };

    controls.appendChild(rangeWrap);
    controls.appendChild(btnGrid);
    controls.appendChild(btnHorizon);

    container.appendChild(controls);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const btnCapture = document.createElement('button');
    btnCapture.className = 'btn';
    btnCapture.textContent = 'Prendre la photo';
    btnCapture.onclick = () => doCapture(video, ghost.src);
    actions.appendChild(btnCapture);
    container.appendChild(actions);
  }

  // Add bottom navigation for photos when in capture mode
  if (state.captureMode && piece.checkin_pictures.length > 1) {
    const bottomNav = document.createElement('div');
    bottomNav.className = 'bottom-photo-nav';
    
    piece.checkin_pictures.forEach((cp, idx) => {
      const navItem = document.createElement('div');
      const isActive = idx === state.selectedRefIndex;
      const isCaptured = isRefCaptured(piece.piece_id, idx);
      
      navItem.className = 'nav-photo-item' + 
        (isActive ? ' active' : '') + 
        (isCaptured ? ' captured' : '');
      
      const navImg = document.createElement('img');
      navImg.src = cp.url;
      navImg.alt = `Photo ${idx + 1}`;
      navItem.appendChild(navImg);
      
      const navLabel = document.createElement('div');
      navLabel.className = 'nav-photo-label';
      navLabel.textContent = `${idx + 1}`;
      navItem.appendChild(navLabel);
      
      if (isCaptured) {
        const checkIcon = document.createElement('div');
        checkIcon.className = 'nav-check-icon';
        checkIcon.textContent = '✓';
        navItem.appendChild(checkIcon);
      }
      
      navItem.onclick = () => {
        if (isCaptured) {
          // Show review for captured photo
          state.reviewMode = true;
          state.reviewingRefIndex = idx;
          state.captureMode = false;
          render();
        } else {
          // Switch to this uncaptured photo
          state.selectedRefIndex = idx;
          updateGhost();
          updateBottomNavActive(bottomNav, idx);
        }
      };
      
      bottomNav.appendChild(navItem);
    });
    
    container.appendChild(bottomNav);
  }

  dom.root.appendChild(container);

  // Initialize camera and ghost
  ensureStream().then(stream => { video.srcObject = stream; }).catch(() => {});
  updateGhost();
  requestAnimationFrame(() => drawGrid(gridOverlay));

  function updateGhost() {
    const ref = piece.checkin_pictures[state.selectedRefIndex];
    if (!ref) return;
    // Preload via createImageBitmap if supported
    ghost.src = ref.url;
  }

  function updateStripActive(strip, activeIdx) {
    Array.from(strip.children).forEach((el, idx) => {
      if (el.classList) {
        if (idx === activeIdx) el.classList.add('active'); else el.classList.remove('active');
      }
    });
  }

  function updateBottomNavActive(nav, activeIdx) {
    Array.from(nav.children).forEach((el, idx) => {
      if (el.classList) {
        if (idx === activeIdx) el.classList.add('active'); else el.classList.remove('active');
      }
    });
  }
}

function drawGrid(canvas) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!state.showGrid && !state.showHorizon) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  if (state.showGrid) {
    // 3x3 grid
    for (let i=1;i<=2;i++) {
      const x = (canvas.width/3)*i;
      const y = (canvas.height/3)*i;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
  }
  if (state.showHorizon) {
    ctx.strokeStyle = 'rgba(79,140,255,0.7)';
    ctx.beginPath(); ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
  }
}

function doCapture(video, refUrl) {
  try {
    const canvas = document.createElement('canvas');
    const track = video.srcObject && /** @type {MediaStream} */(video.srcObject).getVideoTracks()[0];
    const settings = track ? track.getSettings() : {};
    const width = Number(settings.width) || video.videoWidth || 1080;
    const height = Number(settings.height) || video.videoHeight || 1440;

    // ✅ FIX ROTATION BUG: Détecter l'orientation de l'appareil
    const deviceOrientation = getDeviceOrientation();
    const needsRotation = deviceOrientation === 90 || deviceOrientation === -90 || deviceOrientation === 270;

    // Ajuster les dimensions du canvas selon l'orientation
    if (needsRotation) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CTX');

    // ✅ FIX ROTATION BUG: Appliquer la rotation selon l'orientation
    if (needsRotation) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (deviceOrientation === 90 || deviceOrientation === -270) {
        ctx.rotate(90 * Math.PI / 180);
      } else if (deviceOrientation === -90 || deviceOrientation === 270) {
        ctx.rotate(-90 * Math.PI / 180);
      }
      ctx.translate(-width / 2, -height / 2);
    }

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(async (blob) => {
      if (!blob) { emitError('CAPTURE_FAILED', 'Erreur lors de la capture'); return; }
      state.lastCaptureBlob = blob;
      state.lastCaptureMeta = { width: canvas.width, height: canvas.height };
      const tempId = randomId();
      const piece = getSelectedPiece();
      postToParent('photo.capture.preview', { piece_id: piece ? piece.piece_id : null, temp_id: tempId });

      // Direct capture without validation screen
      directConfirmCapture(piece ? piece.piece_id : null);
    }, 'image/jpeg', 0.85);
  } catch (err) {
    emitError('CAPTURE_FAILED', 'Erreur lors de la capture', { err: String(err) });
  }
}

// renderReview function removed - direct capture without validation screen

function directConfirmCapture(pieceId) {
  if (!state.lastCaptureBlob || !state.lastCaptureMeta) { 
    emitError('CAPTURE_FAILED', 'Aucune capture à valider'); 
    return; 
  }
  
  const captureId = randomId();
  const takenAt = new Date().toISOString();
  
  // Convert to data URL
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
    const payload = {
      piece_id: pieceId,
      capture_id: captureId,
      taken_at: takenAt,
      data_url: dataUrl,
      meta: state.lastCaptureMeta,
    };
    postToParent('photo.capture.confirmed', payload);
    
    // Save the captured photo data
    const photoKey = getCapturedPhotoKey(pieceId, state.selectedRefIndex);
    state.capturedPhotos.set(photoKey, {
      blob: state.lastCaptureBlob,
      dataUrl: dataUrl,
      takenAt: takenAt
    });
    
    // Mark this specific reference as captured
    markRefCaptured(pieceId, state.selectedRefIndex);
    
    // Check if piece is fully completed
    if (isPieceFullyCompleted(pieceId)) {
      markStepCompleted(pieceId);
    }
    
    const piece = getSelectedPiece();
    const capturedCount = getPieceCapturedRefsCount(pieceId);
    const totalRefs = piece ? piece.checkin_pictures.length : 1;
    
    if (state.parcoursMode) {
      if (capturedCount === totalRefs) {
        showToast('Pièce terminée ! 🎯');
        // Move to next step or complete parcours
        if (goToNextStep()) {
          render(); // Next step
        } else {
          // Parcours completed
          state.selectedPieceId = null;
          render();
        }
      } else {
        showToast(`Photo capturée ! (${capturedCount}/${totalRefs})`);
        // Stay on same piece but refresh to show indicators
        render();
      }
    } else {
      if (state.captureMode) {
        if (capturedCount === totalRefs) {
          showToast('Toutes les photos capturées ! 🎉');
          // Close capture mode and return to photo list
          state.captureMode = false;
          state.showingPhotoList = true;
          restoreHeader();
          render();
        } else {
          // Auto-advance to next uncaptured photo
          const nextRefIndex = getNextUncapturedRefIndex(pieceId);
          if (nextRefIndex !== -1) {
            state.selectedRefIndex = nextRefIndex;
            showToast(`Photo capturée ! Passage à la photo ${nextRefIndex + 1}`);
          } else {
            showToast(`Photo capturée ! (${capturedCount}/${totalRefs})`);
          }
          // Stay in capture mode but refresh to show indicators and new ref
          render();
        }
      } else {
        showToast(`Photo capturée ! (${capturedCount}/${totalRefs})`);
        // Stay on same piece but refresh to show indicators
        render();
      }
    }
  };
  reader.readAsDataURL(state.lastCaptureBlob);
}

// confirmCapture function kept for legacy compatibility but main flow uses directConfirmCapture

// Data loading
async function loadFromUrl(url) {
  try {
    const res = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!validateData(json)) throw new Error('Invalid data');
    state.data = json; setContextLabel(); render();
  } catch (err) {
    emitError('REF_LOAD_FAILED', 'Chargement des données impossible', { err: String(err) });
  }
}

async function loadRapportList() {
  try {
    const envParam = state.environment === 'test' ? 'test' : 'live';
    const apiUrl = `https://checkeasy-57905.bubbleapps.io/version-${envParam}/api/1.1/wf/rapportList`;
    
    showToast('Chargement des rapports...');
    
    const res = await fetch(apiUrl, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(state.config.authToken ? { 'Authorization': `Bearer ${state.config.authToken}` } : {})
      },
      credentials: 'omit',
      cache: 'no-store' 
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (data.status !== 'success' && data.status !== 'ok') {
      throw new Error(`API Error: ${data.status}`);
    }
    
    if (!data.response || !data.response.rapport || !Array.isArray(data.response.rapport)) {
      throw new Error('Format de réponse invalide');
    }
    
    state.rapportList = data.response.rapport;
    render();
    
  } catch (err) {
    emitError('RAPPORT_LOAD_FAILED', `Impossible de charger les rapports: ${String(err)}`, { err: String(err) });
  }
}

async function selectRapport(rapport) {
  if (!rapport || !rapport._id) {
    emitError('RAPPORT_INVALID', 'Rapport invalide sélectionné');
    return;
  }
  
  state.selectedRapportId = rapport._id;
  
  try {
    const envParam = state.environment === 'test' ? 'test' : 'live';
    const apiUrl = `https://checkeasy-57905.bubbleapps.io/version-${envParam}/api/1.1/wf/rapportEndpoint`;
    
    showToast(`Chargement du rapport "${rapport.Titre || 'Sans titre'}"...`);
    
    // Add rapport parameter to URL
    const urlWithParams = new URL(apiUrl);
    urlWithParams.searchParams.set('rapport', rapport._id);
    
    const res = await fetch(urlWithParams.toString(), { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(state.config.authToken ? { 'Authorization': `Bearer ${state.config.authToken}` } : {})
      },
      credentials: 'omit',
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Clean the data to remove checkout-related fields we don't want
    const cleanedData = {
      logement_id: data.logement_id,
      rapport_id: data.rapport_id,
      pieces: data.pieces ? data.pieces.map(piece => ({
        piece_id: piece.piece_id,
        nom: piece.nom,
        commentaire_ia: piece.commentaire_ia || '',
        checkin_pictures: piece.checkin_pictures || [],
        // Ignore checkout_pictures
        etapes: piece.etapes ? piece.etapes.map(etape => ({
          etape_id: etape.etape_id,
          task_name: etape.task_name,
          consigne: etape.consigne,
          checking_picture: etape.checking_picture
          // Ignore checkout_picture
        })) : []
      })) : []
    };
    
    if (!validateData(cleanedData)) {
      throw new Error('Format de données invalide');
    }
    
    state.data = cleanedData;
    state.rapportList = null; // Clear rapport list to show piece view
    setContextLabel();
    render();
    
  } catch (err) {
    emitError('RAPPORT_LOAD_FAILED', `Impossible de charger le rapport: ${String(err)}`, { err: String(err) });
  }
}

function handleParentMessage(event) {
  // Origin check: accept first origin as parent; then enforce
  if (!parentOrigin) parentOrigin = event.origin;
  if (event.origin !== parentOrigin) return; // ignore others
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  const { type, payload } = msg;
  switch (type) {
    case 'photo.data.provide': {
      if (validateData(payload && payload.json)) {
        state.data = payload.json;
        render();
      } else {
        emitError('REF_LOAD_FAILED', 'JSON invalide');
      }
      break;
    }
    case 'photo.open.piece': {
      const pid = payload && payload.piece_id;
      if (state.data && typeof pid === 'string' && state.data.pieces.some(p => p.piece_id === pid)) {
        state.selectedPieceId = pid; state.selectedRefIndex = 0; render();
      }
      break;
    }
    case 'photo.auth.update': {
      const token = payload && payload.token;
      if (typeof token === 'string') state.config.authToken = token;
      break;
    }
    default:
      // ignore
      break;
  }
}

function initFromQuery() {
  const qs = new URLSearchParams(location.search);
  const token = qs.get('token');
  const rapport_id = qs.get('rapport_id');
  const logement_id = qs.get('logement_id');
  const env = qs.get('env') || qs.get('environment');
  
  if (token) state.config.authToken = token;
  if (env === 'live' || env === 'prod' || env === 'production') {
    state.environment = 'live';
  } else {
    state.environment = 'test'; // default to test
  }
  
  // Display context if provided
  if (rapport_id && logement_id) {
    state.data = state.data || /** @type {any} */({ rapport_id, logement_id, pieces: [] });
  }
  const dataUrl = qs.get('data_url');
  if (dataUrl) loadFromUrl(dataUrl);
  const dataFile = qs.get('data_file');
  if (dataFile) loadFromUrl(dataFile);
  
  // Auto-load rapport list if no specific data provided
  const autoLoad = qs.get('auto_load');
  if (autoLoad === 'true' || autoLoad === '1') {
    setTimeout(() => {
      if (!state.data || !state.data.pieces || state.data.pieces.length === 0) {
        loadRapportList();
      }
    }, 500);
  }
}

function randomId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// PWA Install functionality
let deferredPrompt = null;

function initPWAInstall() {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button
    dom.install.hidden = false;
  });

  // Handle install button click
  dom.install.onclick = async () => {
    if (!deferredPrompt) {
      showToast('Installation non disponible sur cet appareil');
      return;
    }
    
    // Show the prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      showToast('App installée avec succès! 🎉');
    } else {
      showToast('Installation annulée');
    }
    
    // Clear the deferredPrompt
    deferredPrompt = null;
    dom.install.hidden = true;
  };

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    showToast('App installée! Vous pouvez maintenant l\'utiliser hors ligne.');
    dom.install.hidden = true;
    deferredPrompt = null;
  });

  // For iOS Safari - show a different message since it doesn't support beforeinstallprompt
  if (isIOSSafari()) {
    dom.install.hidden = false;
    dom.install.onclick = () => {
      showToast('Sur iOS: Appuyez sur Partager > Ajouter à l\'écran d\'accueil');
    };
  }
}

function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad|iPhone|iPod/);
  const webkit = !!ua.match(/WebKit/);
  return iOS && webkit && !ua.match(/CriOS|Chrome/);
}

// Startup
window.addEventListener('message', handleParentMessage);
window.addEventListener('DOMContentLoaded', () => {
  initFromQuery();
  initPWAInstall();
  render();
  // Announce ready
  postToParent('photo.ready', {});
  // If no data yet, request
  setTimeout(() => { if (!state.data || !validateData(state.data)) postToParent('photo.data.request', {}); }, 200);
});


