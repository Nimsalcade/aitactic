document.addEventListener('DOMContentLoaded', () => {
    const playersRoot = document.getElementById('players-container');
    const addPlayerBtn = document.getElementById('add-player');
    const addOppositionBtn = document.getElementById('add-opposition');
    const addBallBtn = document.getElementById('add-ball');
    const addMyTeamBtn = document.getElementById('add-my-team');
    const formationOppSelect = document.getElementById('formation-opposition');
    const formationMySelect = document.getElementById('formation-my');
    const slidesBar = document.getElementById('slides-bar');
    const slidesList = document.getElementById('slides-list');
    const addSlideBtn = document.getElementById('add-slide');
    const playSlidesBtn = document.getElementById('play-slides');
    const exportGifBtn = document.getElementById('export-gif');
    const speedSlider = document.getElementById('animation-speed');
    const speedValueEl = document.getElementById('animation-speed-value');
    const confirmOverlay = document.getElementById('confirm-overlay');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    // Drawing removed
    const pitchContainer = document.getElementById('pitch-container');
    
    // Slides state (simple)
    let slides = [];
    let activeSlideId = null;
    let currentSlideContainer = null; // active slide layer inside playersRoot
    let isExportingGif = false;
    function getActiveContainer() {
        return currentSlideContainer || playersRoot;
    }
    
    // Drawing removed
    // Standalone draggable for 15px ball elements
    function makeDraggableBallEl(element) {
        const ballSize = 10;
        let pos3 = 0, pos4 = 0;
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
        function getBounds() {
            const b = getBlackBoxBounds();
            return {
                minX: b.minX,
                maxX: b.maxX - ballSize,
                minY: b.minY,
                maxY: b.maxY - ballSize,
            };
        }
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function dragTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0] || e.changedTouches[0];
            pos3 = touch.clientX; pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            const bounds = getBounds();
            const containerRect = pitchContainer.getBoundingClientRect();
            let newLeft = element.offsetLeft - (pos3 - e.clientX);
            let newTop = element.offsetTop - (pos4 - e.clientY);
            const elementRect = element.getBoundingClientRect();
            const newX = elementRect.left - (pos3 - e.clientX);
            const newY = elementRect.top - (pos4 - e.clientY);
            if (newX < bounds.minX) newLeft = bounds.minX - containerRect.left;
            if (newX > bounds.maxX) newLeft = bounds.maxX - containerRect.left;
            if (newY < bounds.minY) newTop = bounds.minY - containerRect.top;
            if (newY > bounds.maxY) newTop = bounds.maxY - containerRect.top;
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            pos3 = e.clientX; pos4 = e.clientY;
        }
        function elementDragTouch(e) {
            const touch = e.touches[0] || e.changedTouches[0];
            const bounds = getBounds();
            const containerRect = pitchContainer.getBoundingClientRect();
            let newLeft = element.offsetLeft - (pos3 - touch.clientX);
            let newTop = element.offsetTop - (pos4 - touch.clientY);
            const elementRect = element.getBoundingClientRect();
            const newX = elementRect.left - (pos3 - touch.clientX);
            const newY = elementRect.top - (pos4 - touch.clientY);
            if (newX < bounds.minX) newLeft = bounds.minX - containerRect.left;
            if (newX > bounds.maxX) newLeft = bounds.maxX - containerRect.left;
            if (newY < bounds.minY) newTop = bounds.minY - containerRect.top;
            if (newY > bounds.maxY) newTop = bounds.maxY - containerRect.top;
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            pos3 = touch.clientX; pos4 = touch.clientY;
        }
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }
    // Multi-select state
    const selectedElements = new Set();
    function clearSelection() {
        selectedElements.forEach(el => el.classList.remove('selected'));
        selectedElements.clear();
    }
    function addToSelection(el) {
        if (!selectedElements.has(el)) {
            selectedElements.add(el);
            el.classList.add('selected');
        }
    }
    function selectOnly(el) {
        clearSelection();
        addToSelection(el);
    }
    
    // Helpers for team counts and occupancy
    function getTeamCount(isOpposition) {
        const container = getActiveContainer();
        return container.querySelectorAll(isOpposition ? '.player.opposition' : '.player:not(.opposition)').length;
    }
    function isSpotOccupied(x, y, isOpposition) {
        const container = getActiveContainer();
        const teamNodes = container.querySelectorAll(isOpposition ? '.player.opposition' : '.player:not(.opposition)');
        const containerRect = pitchContainer.getBoundingClientRect();
        const targetX = x; // already container-relative
        const targetY = y;
        const threshold = 20; // px radius to consider occupied
        for (const el of teamNodes) {
            const half = el.offsetWidth / 2;
            const cx = el.offsetLeft + half;
            const cy = el.offsetTop + half;
            const dx = cx - targetX;
            const dy = cy - targetY;
            if (Math.hypot(dx, dy) <= threshold) return true;
        }
        return false;
    }
    const clearAllBtn = document.getElementById('clear-all');
    
    let isEditing = false;
    
    let playerCount = 0;
    const positions = [
        'GK', 'CB', 'CB', 'CB', 'RB', 'LB',
        'CDM', 'CM', 'CAM', 'RM', 'LM',
        'RW', 'LW', 'ST', 'CF'
    ];
    let tokenIdCounter = 0;
    function ensureTokenId(el) {
        if (!el || !el.dataset) return;
        const existing = el.dataset.tokenId;
        if (existing) {
            const maybeNum = parseInt(existing.split('-')[1], 10);
            if (!Number.isNaN(maybeNum)) {
                tokenIdCounter = Math.max(tokenIdCounter, maybeNum);
            }
            return;
        }
        tokenIdCounter += 1;
        el.dataset.tokenId = `token-${tokenIdCounter}`;
    }
    
    // Helper function to describe the playable bounds (entire pitch surface)
    function getBlackBoxBounds() {
        const containerRect = pitchContainer.getBoundingClientRect();
        const pitchImg = pitchContainer.querySelector('img');
        const imageRect = pitchImg ? pitchImg.getBoundingClientRect() : null;
        const rect = (imageRect && imageRect.width > 0) ? imageRect : containerRect;
        // Limit the playable area to the inner pitch (inside the white touchlines)
        // using a conservative inset ratio that matches our horizontal asset.
        const insetRatioX = 0.075; // ~7.5% from left/right edges
        const insetRatioY = 0.075; // ~7.5% from top/bottom edges
        const insetX = rect.width * insetRatioX;
        const insetY = rect.height * insetRatioY;
        const minX = rect.left + insetX;
        const maxX = rect.right - insetX;
        const minY = rect.top + insetY;
        const maxY = rect.bottom - insetY;
        return {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    // Add player function with boundary checking
    function addPlayer(x, y, isOpposition = false) {
        // Enforce 11-player team limit
        if (getTeamCount(isOpposition) >= 11) return;
        const player = document.createElement('div');
        player.className = `player ${isOpposition ? 'opposition' : ''}`;
        player.draggable = true;
        ensureTokenId(player);
        
        // Get current pitch boundaries (player playable area)
        const bounds = getBlackBoxBounds();
        const containerRect = pitchContainer.getBoundingClientRect();
        
        // Adjust x, y to be within pitch boundaries
        const playerSize = 20; // Match CSS size
        const adjustedX = Math.max(bounds.minX - containerRect.left, Math.min(x, bounds.maxX - playerSize - containerRect.left));
        const adjustedY = Math.max(bounds.minY - containerRect.top, Math.min(y, bounds.maxY - playerSize - containerRect.top));
        
        // Use adjusted positions
        x = adjustedX;
        y = adjustedY;
        
        // Position the player at the clicked coordinates (centered)
        const half = playerSize / 2; // 10px
        const playerX = x - half; // center token
        const playerY = y - half; // center token
        
        player.style.left = `${playerX}px`;
        player.style.top = `${playerY}px`;
        
        if (!isOpposition) {
            playerCount++;
            const position = positions[playerCount % positions.length];
            player.dataset.position = position;
            
            // Add player number (editable)
            const numberSpan = document.createElement('span');
            numberSpan.className = 'player-number';
            numberSpan.textContent = playerCount;
            
            // Add position indicator
            const positionSpan = document.createElement('span');
            positionSpan.className = 'player-position';
            positionSpan.textContent = position;
            
            player.appendChild(numberSpan);
            player.appendChild(positionSpan);
            
            // Add double click to edit
            player.addEventListener('dblclick', (e) => {
                if (isEditing) return;
                isEditing = true;
                
                const currentText = numberSpan.textContent;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'player-input';
                input.value = currentText;
                input.maxLength = 3;
                
                // Replace number with input
                numberSpan.textContent = '';
                numberSpan.appendChild(input);
                input.focus();
                
                // Save on blur or enter
                const save = () => {
                    numberSpan.textContent = input.value.trim() || currentText;
                    isEditing = false;
                };
                
                input.addEventListener('blur', save);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        save();
                    }
                });
            });
            
            // Make position label editable on double click (my team only)
            positionSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (isEditing) return;
                isEditing = true;
                
                const currentLabel = positionSpan.textContent;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'player-input';
                input.value = currentLabel;
                input.maxLength = 16;
                // Visual alignment with label
                input.style.fontSize = '0.7rem';
                input.style.color = '#ffffff';
                input.style.textTransform = 'none';
                
                positionSpan.textContent = '';
                positionSpan.appendChild(input);
                input.focus();
                input.select();
                
                const saveLabel = () => {
                    const newText = input.value.trim();
                    positionSpan.textContent = newText || currentLabel;
                    isEditing = false;
                };
                
                input.addEventListener('blur', saveLabel);
                input.addEventListener('keypress', (ke) => {
                    if (ke.key === 'Enter') {
                        saveLabel();
                    }
                });
            });

            // --- Mobile editing: double-tap or long-press on number/label ---
            let blockDelete = false;
            const setupTouchEdit = (targetEl, onBeginEdit) => {
                let lastTap = 0;
                let longPressTimer = null;
                const LONG_PRESS_MS = 450;
                const TAP_WINDOW = 300;
                
                function begin() {
                    blockDelete = true;
                    onBeginEdit();
                }
                
                targetEl.addEventListener('touchstart', (ev) => {
                    ev.stopPropagation();
                    longPressTimer = setTimeout(begin, LONG_PRESS_MS);
                }, { passive: true });
                
                targetEl.addEventListener('touchend', (ev) => {
                    ev.stopPropagation();
                    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
                    const now = Date.now();
                    if (now - lastTap < TAP_WINDOW) {
                        begin();
                    }
                    lastTap = now;
                }, { passive: true });
                
                targetEl.addEventListener('touchmove', (ev) => {
                    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
                }, { passive: true });
            };
            
            // Hook number edit
            setupTouchEdit(numberSpan, () => {
                if (isEditing) return;
                isEditing = true;
                const currentText = numberSpan.textContent || '';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'player-input';
                input.value = currentText;
                input.maxLength = 3;
                numberSpan.textContent = '';
                numberSpan.appendChild(input);
                input.focus();
                const save = () => {
                    numberSpan.textContent = input.value.trim() || currentText;
                    isEditing = false;
                    setTimeout(() => { blockDelete = false; }, 50);
                };
                input.addEventListener('blur', save);
                input.addEventListener('keypress', (e) => { if (e.key === 'Enter') save(); });
            });
            
            // Hook label edit
            setupTouchEdit(positionSpan, () => {
                if (isEditing) return;
                isEditing = true;
                const currentLabel = positionSpan.textContent || '';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'player-input';
                input.value = currentLabel;
                input.maxLength = 16;
                input.style.fontSize = '0.7rem';
                input.style.color = '#ffffff';
                input.style.textTransform = 'none';
                positionSpan.textContent = '';
                positionSpan.appendChild(input);
                input.focus();
                input.select();
                const saveLabel = () => {
                    const newText = input.value.trim();
                    positionSpan.textContent = newText || currentLabel;
                    isEditing = false;
                    setTimeout(() => { blockDelete = false; }, 50);
                };
                input.addEventListener('blur', saveLabel);
                input.addEventListener('keypress', (ke) => { if (ke.key === 'Enter') saveLabel(); });
            });
        }
        
        // Add triple-click to delete player
        let clickCount = 0;
        let clickTimer = null;
        let wasDragged = false;
        let dragStartTime = 0;
        const TRIPLE_CLICK_DELAY = 400; // milliseconds between clicks
        const DRAG_THRESHOLD = 5; // pixels moved to consider it a drag
        
        const handleTripleClick = (e) => {
            // Don't delete if player was just dragged
            if (wasDragged) {
                wasDragged = false;
                clickCount = 0;
                return;
            }
            // Suppress delete while editing/opening edit via touch
            if (typeof blockDelete !== 'undefined' && blockDelete) {
                clickCount = 0;
                return;
            }
            
            e.stopPropagation();
            clickCount++;
            
            if (clickTimer) {
                clearTimeout(clickTimer);
            }
            
            clickTimer = setTimeout(() => {
                if (clickCount === 3) {
                    // Triple-click detected - delete player
                    player.remove();
                    // Decrease player count if it's not an opposition player
                    if (!isOpposition && playerCount > 0) {
                        playerCount--;
                    }
                }
                clickCount = 0;
            }, TRIPLE_CLICK_DELAY);
        };
        
        // Track if player was dragged to prevent accidental deletion
        let mouseDownX = 0;
        let mouseDownY = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        
        player.addEventListener('mousedown', (e) => {
            mouseDownX = e.clientX;
            mouseDownY = e.clientY;
            wasDragged = false;
        });
        
        player.addEventListener('mousemove', (e) => {
            if (mouseDownX !== 0 && mouseDownY !== 0) {
                const deltaX = Math.abs(e.clientX - mouseDownX);
                const deltaY = Math.abs(e.clientY - mouseDownY);
                if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
                    wasDragged = true;
                }
            }
        });
        
        player.addEventListener('mouseup', () => {
            mouseDownX = 0;
            mouseDownY = 0;
        });
        
        // Add triple-click handler for mouse
        player.addEventListener('click', handleTripleClick);
        
        // Add triple-tap handler for touch devices
        let tapCount = 0;
        let tapTimer = null;
        const TRIPLE_TAP_DELAY = 400; // milliseconds between taps
        let touchWasDragged = false;
        
        player.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchWasDragged = false;
        });
        
        player.addEventListener('touchmove', (e) => {
            if (touchStartX !== 0 && touchStartY !== 0) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStartX);
                const deltaY = Math.abs(touch.clientY - touchStartY);
                if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
                    touchWasDragged = true;
                }
            }
        });
        
        player.addEventListener('touchend', (e) => {
            // Don't delete if player was just dragged
            if (touchWasDragged) {
                touchWasDragged = false;
                touchStartX = 0;
                touchStartY = 0;
                tapCount = 0;
                return;
            }
            
            e.stopPropagation();
            if (typeof blockDelete !== 'undefined' && blockDelete) {
                tapCount = 0;
                return;
            }
            tapCount++;
            
            if (tapTimer) {
                clearTimeout(tapTimer);
            }
            
            tapTimer = setTimeout(() => {
                if (tapCount === 3) {
                    // Triple-tap detected - delete player
                    e.preventDefault();
                    player.remove();
                    // Decrease player count if it's not an opposition player
                    if (!isOpposition && playerCount > 0) {
                        playerCount--;
                    }
                }
                tapCount = 0;
            }, TRIPLE_TAP_DELAY);
            
            touchStartX = 0;
            touchStartY = 0;
        });
        
        // Make player draggable
        makeDraggable(player);
        
        getActiveContainer().appendChild(player);
    }
    
    // Add ball function (15x15) with boundary checking - duplicated and simplified from addPlayer
    function addBall(x, y) {
        // Create ball image element
        const ball = document.createElement('img');
        ball.src = 'Soccerball.png';
        ball.alt = 'Ball';
        ball.className = 'ball';
        ball.draggable = true;
        ensureTokenId(ball);
        // Ensure size is exactly 10x10 regardless of external CSS
        ball.style.width = '10px';
        ball.style.height = '10px';
        
        // Respect the same pitch boundaries as players
        const bounds = getBlackBoxBounds();
        const containerRect = pitchContainer.getBoundingClientRect();
        
        // Dimensions for ball
        const ballSize = 10; // Match CSS (10x10)
        
        // If no coordinates provided, place at center
        if (typeof x !== 'number' || typeof y !== 'number') {
            x = bounds.minX - containerRect.left + (bounds.width / 2);
            y = bounds.minY - containerRect.top + (bounds.height / 2);
        }
        
        // Clamp within the playable bounds
        const adjustedX = Math.max(bounds.minX - containerRect.left, Math.min(x, bounds.maxX - ballSize - containerRect.left));
        const adjustedY = Math.max(bounds.minY - containerRect.top, Math.min(y, bounds.maxY - ballSize - containerRect.top));
        
        // Center the ball at the coordinates
        const ballX = adjustedX - (ballSize / 2);
        const ballY = adjustedY - (ballSize / 2);
        
        ball.style.left = `${ballX}px`;
        ball.style.top = `${ballY}px`;
        
        // Triple-click/tap to delete (same logic as players)
        let clickCount = 0;
        let clickTimer = null;
        let wasDragged = false;
        const TRIPLE_CLICK_DELAY = 400;
        const DRAG_THRESHOLD = 5;
        
        const handleTripleClick = (e) => {
            if (wasDragged) {
                wasDragged = false;
                clickCount = 0;
                return;
            }
            e.stopPropagation();
            clickCount++;
            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                if (clickCount === 3) {
                    ball.remove();
                }
                clickCount = 0;
            }, TRIPLE_CLICK_DELAY);
        };
        
        let mouseDownX = 0, mouseDownY = 0;
        let touchStartX = 0, touchStartY = 0;
        
        ball.addEventListener('mousedown', (e) => {
            mouseDownX = e.clientX;
            mouseDownY = e.clientY;
            wasDragged = false;
        });
        ball.addEventListener('mousemove', (e) => {
            if (mouseDownX || mouseDownY) {
                const dx = Math.abs(e.clientX - mouseDownX);
                const dy = Math.abs(e.clientY - mouseDownY);
                if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) wasDragged = true;
            }
        });
        ball.addEventListener('mouseup', () => {
            mouseDownX = 0; mouseDownY = 0;
        });
        ball.addEventListener('click', handleTripleClick);
        
        ball.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            touchStartX = t.clientX; touchStartY = t.clientY;
            wasDragged = false;
        });
        ball.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            const dx = Math.abs(t.clientX - touchStartX);
            const dy = Math.abs(t.clientY - touchStartY);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) wasDragged = true;
        });
        ball.addEventListener('touchend', (e) => {
            if (wasDragged) { wasDragged = false; return; }
            handleTripleClick(e);
        });
        
        // Use shared draggable for ball
        makeDraggableBallEl(ball);
        getActiveContainer().appendChild(ball);
    }
    
    // Make elements draggable with boundary checking
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const playerSize = 20; // Match CSS size
        
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
        
        function getPitchBounds() {
            // Use current pitch boundaries for movement constraints
            const bounds = getBlackBoxBounds();
            const containerRect = pitchContainer.getBoundingClientRect();
            
            return {
                minX: bounds.minX,
                maxX: bounds.maxX - playerSize,
                minY: bounds.minY,
                maxY: bounds.maxY - playerSize,
                width: bounds.width,
                height: bounds.height
            };
        }
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // Prepare drag group: all selected tokens or just this one
            let dragGroup = null;
            let groupStartPositions = null;
            const startClientX = e.clientX;
            const startClientY = e.clientY;
            if (selectedElements.size > 0 && selectedElements.has(element)) {
                dragGroup = Array.from(selectedElements);
            } else {
                dragGroup = [element];
            }
            groupStartPositions = dragGroup.map(el => ({
                el,
                left: el.offsetLeft,
                top: el.offsetTop
            }));
            document.onmouseup = closeDragElement;
            // Call a function whenever the cursor moves
            document.onmousemove = (ev) => elementDrag(ev, dragGroup, groupStartPositions, startClientX, startClientY);
        }
        
        function dragTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0] || e.changedTouches[0];
            const startClientX = touch.clientX;
            const startClientY = touch.clientY;
            // Prepare drag group
            let dragGroup = null;
            let groupStartPositions = null;
            if (selectedElements.size > 0 && selectedElements.has(element)) {
                dragGroup = Array.from(selectedElements);
            } else {
                dragGroup = [element];
            }
            groupStartPositions = dragGroup.map(el => ({
                el,
                left: el.offsetLeft,
                top: el.offsetTop
            }));
            document.ontouchend = closeDragElement;
            document.ontouchmove = (ev) => elementDragTouch(ev, dragGroup, groupStartPositions, startClientX, startClientY);
        }
        
        function elementDrag(e, dragGroup = [element], groupStartPositions = [{ el: element, left: element.offsetLeft, top: element.offsetTop }], startClientX = pos3, startClientY = pos4) {
            e = e || window.event;
            e.preventDefault();
            
            // Get pitch boundaries
            const bounds = getPitchBounds();
            const containerRect = pitchContainer.getBoundingClientRect();
            
            // Calculate deltas from drag start (not incremental)
            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;
            
            // Move each element in the drag group
            dragGroup.forEach((gEl, idx) => {
                const start = groupStartPositions[idx];
                let newLeft = start.left + dx;
                let newTop = start.top + dy;
            // Convert to viewport coordinates for boundary checking
                const newX = containerRect.left + newLeft;
                const newY = containerRect.top + newTop;
            
            if (newX < bounds.minX) newLeft = bounds.minX - containerRect.left;
            if (newX > bounds.maxX) newLeft = bounds.maxX - containerRect.left;
            if (newY < bounds.minY) newTop = bounds.minY - containerRect.top;
            if (newY > bounds.maxY) newTop = bounds.maxY - containerRect.top;
            
                gEl.style.left = newLeft + 'px';
                gEl.style.top = newTop + 'px';
            });
        }
        
        function elementDragTouch(e, dragGroup = [element], groupStartPositions = [{ el: element, left: element.offsetLeft, top: element.offsetTop }], startClientX = pos3, startClientY = pos4) {
            const touch = e.touches[0] || e.changedTouches[0];
            
            // Get pitch boundaries
            const bounds = getPitchBounds();
            const containerRect = pitchContainer.getBoundingClientRect();
            
            const dx = touch.clientX - startClientX;
            const dy = touch.clientY - startClientY;
            
            dragGroup.forEach((gEl, idx) => {
                const start = groupStartPositions[idx];
                let newLeft = start.left + dx;
                let newTop = start.top + dy;
                const newX = containerRect.left + newLeft;
                const newY = containerRect.top + newTop;
            
            if (newX < bounds.minX) newLeft = bounds.minX - containerRect.left;
            if (newX > bounds.maxX) newLeft = bounds.maxX - containerRect.left;
            if (newY < bounds.minY) newTop = bounds.minY - containerRect.top;
            if (newY > bounds.maxY) newTop = bounds.maxY - containerRect.top;
            
                gEl.style.left = newLeft + 'px';
                gEl.style.top = newTop + 'px';
            });
        }
        
        function closeDragElement() {
            // Stop moving when mouse/touch is released
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }
    
    // Formation presets (normalized across width; y is within a half 0..1)
    function getFormationPreset(name) {
        const presets = {
            '4-4-2': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.15, 0.35, 0.65, 0.85].map(x => ({ x, y: 0.28 })),
                midfielders: [0.15, 0.35, 0.65, 0.85].map(x => ({ x, y: 0.52 })),
                forwards: [0.40, 0.60].map(x => ({ x, y: 0.80 }))
            },
            '4-3-3': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.15, 0.35, 0.65, 0.85].map(x => ({ x, y: 0.28 })),
                midfielders: [0.30, 0.50, 0.70].map(x => ({ x, y: 0.52 })),
                forwards: [0.20, 0.50, 0.80].map(x => ({ x, y: 0.82 }))
            },
            '4-2-3-1': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.15, 0.35, 0.65, 0.85].map(x => ({ x, y: 0.28 })),
                midfielders: [0.35, 0.65].map(x => ({ x, y: 0.45 })), // double pivot
                attacking: [0.25, 0.50, 0.75].map(x => ({ x, y: 0.62 })), // 3 AMs
                forwards: [0.50].map(x => ({ x, y: 0.82 }))
            },
            '3-5-2': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.25, 0.50, 0.75].map(x => ({ x, y: 0.28 })),
                midfielders: [0.15, 0.35, 0.50, 0.65, 0.85].map(x => ({ x, y: 0.52 })),
                forwards: [0.40, 0.60].map(x => ({ x, y: 0.80 }))
            },
            '5-3-2': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.10, 0.30, 0.50, 0.70, 0.90].map(x => ({ x, y: 0.28 })),
                midfielders: [0.30, 0.50, 0.70].map(x => ({ x, y: 0.52 })),
                forwards: [0.40, 0.60].map(x => ({ x, y: 0.80 }))
            },
            '3-4-3': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.25, 0.50, 0.75].map(x => ({ x, y: 0.28 })),
                midfielders: [0.20, 0.40, 0.60, 0.80].map(x => ({ x, y: 0.52 })),
                forwards: [0.20, 0.50, 0.80].map(x => ({ x, y: 0.82 }))
            },
            '4-5-1': {
                gk: { x: 0.5, y: 0.10 },
                defenders: [0.15, 0.35, 0.65, 0.85].map(x => ({ x, y: 0.28 })),
                midfielders: [0.15, 0.30, 0.50, 0.70, 0.85].map(x => ({ x, y: 0.55 })),
                forwards: [0.50].map(x => ({ x, y: 0.82 }))
            }
        };
        return presets[name] || presets['4-4-2'];
    }
    
    // Add a team of players in formation
    function addTeam(isOpposition = false, options = {}) {
        const { side = isOpposition ? 'top' : 'bottom', formation = '4-4-2' } = options;
        const bounds = getBlackBoxBounds();
        const containerRect = pitchContainer.getBoundingClientRect();
        const pitchWidth = bounds.width;
        const pitchHeight = bounds.height;
        const current = getTeamCount(isOpposition);
        let remaining = Math.max(0, 11 - current);
        if (remaining === 0) return;
        const halfHeight = pitchHeight / 2;
        const halfWidth = pitchWidth / 2;
        const isLandscape = pitchWidth >= pitchHeight;
        const offsetX = bounds.minX - containerRect.left;
        const offsetY = bounds.minY - containerRect.top;
        const preset = getFormationPreset(formation);
        
        function toCoordsHalf(pos, whichSide = side) {
            if (!isLandscape) {
                const yNorm = whichSide === 'top' ? pos.y : (1 - pos.y); // mirror vertically for bottom half
                const baseY = whichSide === 'top' ? offsetY : offsetY + halfHeight;
                return {
                    x: offsetX + pos.x * pitchWidth,
                    y: baseY + yNorm * halfHeight
                };
            }
            // Landscape: treat former top/bottom as left/right halves and keep tokens away from the boards
            const xNorm = whichSide === 'top' ? pos.y : (1 - pos.y);
            const baseX = whichSide === 'top' ? offsetX : offsetX + halfWidth;
            const halfEnd = baseX + halfWidth;
            const horizontalMargin = Math.min(80, halfWidth * 0.08); // keep players off the touchline
            let innerStart = baseX + horizontalMargin;
            let innerEnd = halfEnd - horizontalMargin;
            let usableWidth = innerEnd - innerStart;
            if (usableWidth <= 0) {
                usableWidth = halfWidth * 0.6;
                const center = baseX + halfWidth / 2;
                innerStart = center - usableWidth / 2;
            }
            return {
                x: innerStart + xNorm * usableWidth,
                y: offsetY + pos.x * pitchHeight
            };
        }
        
        // Build ordered list of positions (GK, defenders, midfielders, attacking, forwards)
        const ordered = [];
        ordered.push(preset.gk);
        ['defenders', 'midfielders', 'attacking', 'forwards'].forEach(line => {
            if (preset[line]) ordered.push(...preset[line]);
        });
        // Iterate and place up to 'remaining' players in available spots
        for (const pos of ordered) {
            if (remaining <= 0) break;
            // In landscape: place my team on the left half, opposition on the right half
            // In portrait: original behavior (my team bottom, opposition top)
            const cp = isLandscape
                ? toCoordsHalf(pos, isOpposition ? 'bottom' : 'top')
                : toCoordsHalf(pos, isOpposition ? 'top' : 'bottom');
            if (isSpotOccupied(cp.x, cp.y, isOpposition)) continue;
            addPlayer(cp.x, cp.y, isOpposition);
            remaining--;
        }
    }
    
    // Add player on button click
    addPlayerBtn.addEventListener('click', (e) => {
        // Add a single player at center
        // Respect team limit (my team)
        if (getTeamCount(false) < 11) {
            const bounds = getBlackBoxBounds();
            const containerRect = pitchContainer.getBoundingClientRect();
            const x = bounds.minX - containerRect.left + (bounds.width / 2);
            const y = bounds.minY - containerRect.top + (bounds.height / 2);
            addPlayer(x, y, false);
        }
    });
    
    // Add opposition team (top half) with selected formation
    addOppositionBtn.addEventListener('click', (e) => {
        const formation = formationOppSelect ? formationOppSelect.value : '4-4-2';
        addTeam(true, { side: 'top', formation });
    });
    
    // Add my team (bottom half, white tokens) with selected formation
    if (addMyTeamBtn) {
        addMyTeamBtn.addEventListener('click', () => {
            const formation = formationMySelect ? formationMySelect.value : '4-4-2';
            addTeam(false, { side: 'bottom', formation });
        });
    }
    
    // Add ball button - places a 15x15 ball at center of playable area
    if (addBallBtn) {
        addBallBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addBall(); // center placement when no coordinates
        });
    }
    // Helper function to check if a point is still on the pitch
    function isPointInBlackBox(x, y) {
        const bounds = getBlackBoxBounds();
        return x >= bounds.minX &&
               x <= bounds.maxX &&
               y >= bounds.minY &&
               y <= bounds.maxY;
    }
    
    // Lasso selection on the pitch
    (function setupLassoSelection() {
        let isSelecting = false;
        let startX = 0, startY = 0;
        let moved = false;
        let ignoreNextPitchClick = false;
        const rectEl = document.createElement('div');
        rectEl.className = 'selection-rect';
        pitchContainer.appendChild(rectEl);
        // Helper to get playable bounds in container-relative coordinates
        function getPlayableBoundsLocal() {
            const bounds = getBlackBoxBounds();
            const cr = pitchContainer.getBoundingClientRect();
            return {
                minX: bounds.minX - cr.left,
                maxX: bounds.maxX - cr.left,
                minY: bounds.minY - cr.top,
                maxY: bounds.maxY - cr.top
            };
        }
        
        function updateSelectionRect(x1, y1, x2, y2) {
            const left = Math.min(x1, x2);
            const top = Math.min(y1, y2);
            const width = Math.abs(x2 - x1);
            const height = Math.abs(y2 - y1);
            rectEl.style.left = left + 'px';
            rectEl.style.top = top + 'px';
            rectEl.style.width = width + 'px';
            rectEl.style.height = height + 'px';
        }
        
        function selectIntersecting(x1, y1, x2, y2) {
            const container = getActiveContainer();
            const items = container.querySelectorAll('.player, .ball');
            const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
            clearSelection();
            items.forEach(el => {
                const r = el.getBoundingClientRect();
                const cr = pitchContainer.getBoundingClientRect();
                const ex1 = r.left - cr.left;
                const ey1 = r.top - cr.top;
                const ex2 = ex1 + r.width;
                const ey2 = ey1 + r.height;
                const overlap = !(ex2 < minX || ex1 > maxX || ey2 < minY || ey1 > maxY);
                if (overlap) addToSelection(el);
            });
        }
        
        pitchContainer.addEventListener('mousedown', (e) => {
            // Start selection only when clicking empty space (not a token)
            if (e.target.closest('.player') || e.target.closest('.ball')) return;
            const cr = pitchContainer.getBoundingClientRect();
            const bounds = getPlayableBoundsLocal();
            startX = Math.max(bounds.minX, Math.min(e.clientX - cr.left, bounds.maxX));
            startY = Math.max(bounds.minY, Math.min(e.clientY - cr.top, bounds.maxY));
            isSelecting = true;
            moved = false;
            rectEl.style.display = 'block';
            updateSelectionRect(startX, startY, startX, startY);
            // while selecting, do not add players on click
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;
            const cr = pitchContainer.getBoundingClientRect();
            const bounds = getPlayableBoundsLocal();
            const x = Math.max(bounds.minX, Math.min(e.clientX - cr.left, bounds.maxX));
            const y = Math.max(bounds.minY, Math.min(e.clientY - cr.top, bounds.maxY));
            if (Math.abs(x - startX) > 2 || Math.abs(y - startY) > 2) moved = true;
            updateSelectionRect(startX, startY, x, y);
            selectIntersecting(startX, startY, x, y);
        });
        
        document.addEventListener('mouseup', () => {
            if (!isSelecting) return;
            rectEl.style.display = 'none';
            isSelecting = false;
            if (!moved) {
                // click without movement clears selection
                clearSelection();
            } else {
                // prevent the synthetic click after drag-select from clearing selection
                ignoreNextPitchClick = true;
                setTimeout(() => { ignoreNextPitchClick = false; }, 0);
            }
        });
        
        // Clicking anywhere on blank pitch clears selection
    pitchContainer.addEventListener('click', (e) => {
            if (e.target.closest('.player') || e.target.closest('.ball')) return;
            if (ignoreNextPitchClick) {
                ignoreNextPitchClick = false;
                return;
            }
            clearSelection();
        });
    })();
    // Add player on pitch click (only within playable area)
    pitchContainer.addEventListener('click', (e) => {
        if (e.target.closest('.player') || e.target.closest('.ball')) return;
        if (!isPointInBlackBox(e.clientX, e.clientY)) return;
        const rect = pitchContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addPlayer(x, y, false);
    });
    
    // Add touch support for mobile (only within playable area)
    pitchContainer.addEventListener('touchend', (e) => {
        if (e.target.closest('.player') || e.target.closest('.ball')) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        if (!isPointInBlackBox(touch.clientX, touch.clientY)) return;
        const rect = pitchContainer.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        addPlayer(x, y, false);
    }, { passive: false });
    
    // Clear all players
    clearAllBtn.addEventListener('click', () => {
        showConfirm('Are you sure you want to remove all players?', () => {
            getActiveContainer().innerHTML = '';
            playerCount = 0;
        });
    });
    
    // Prevent default touch behavior
    document.addEventListener('touchmove', (e) => {
        const t = e.target;
        if ((t.classList && (t.classList.contains('player') || t.classList.contains('player-input') || t.classList.contains('player-number') || t.classList.contains('player-position'))) ||
            (t.closest && t.closest('#pitch-container'))) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // In-app confirm helper
    function showConfirm(message, onOk) {
        if (!confirmOverlay) {
            if (window.confirm(message)) onOk && onOk();
            return;
        }
        confirmMessage.textContent = message;
        confirmOverlay.classList.remove('hidden');
        const close = () => confirmOverlay.classList.add('hidden');
        const okHandler = () => { close(); onOk && onOk(); cleanup(); };
        const cancelHandler = () => { close(); cleanup(); };
        function cleanup() {
            confirmOk.removeEventListener('click', okHandler);
            confirmCancel.removeEventListener('click', cancelHandler);
            confirmOverlay.removeEventListener('click', backdropHandler);
        }
        function backdropHandler(e) {
            if (e.target === confirmOverlay) cancelHandler();
        }
        confirmOk.addEventListener('click', okHandler);
        confirmCancel.addEventListener('click', cancelHandler);
        confirmOverlay.addEventListener('click', backdropHandler);
    }
    
    // Function to update pitch overlay position
    function updatePitchOverlay() {
        const pitchOverlay = document.getElementById('pitch-overlay');
        if (!pitchOverlay) return;
        
        const pitchImg = document.querySelector('#pitch-container img');
        if (!pitchImg) return;
        
        const rect = pitchImg.getBoundingClientRect();
        const containerRect = pitchContainer.getBoundingClientRect();
        const pitchAspect = 1320 / 2868;
        
        let pitchWidth, pitchHeight, pitchX, pitchY;
        
        if (rect.width / rect.height > pitchAspect) {
            // Container is wider than pitch aspect ratio
            pitchHeight = rect.height;
            pitchWidth = pitchHeight * pitchAspect;
            pitchX = (rect.width - pitchWidth) / 2;
            pitchY = 0;
        } else {
            // Container is taller than pitch aspect ratio
            pitchWidth = rect.width;
            pitchHeight = pitchWidth / pitchAspect;
            pitchX = 0;
            pitchY = (rect.height - pitchHeight) / 2;
        }
        
        // Apply the calculated dimensions to the overlay
        pitchOverlay.style.left = `${pitchX}px`;
        pitchOverlay.style.top = `${pitchY}px`;
        pitchOverlay.style.width = `${pitchWidth}px`;
        pitchOverlay.style.height = `${pitchHeight}px`;
    }
    
    // Update overlay on load and window resize
    window.addEventListener('load', updatePitchOverlay);
    window.addEventListener('resize', updatePitchOverlay);
    
    // Also update when the image loads
    const pitchImg = document.querySelector('#pitch-container img');
    if (pitchImg.complete) {
        updatePitchOverlay();
    } else {
        pitchImg.addEventListener('load', updatePitchOverlay);
    }
    
    const magicMoveCleanupSymbol = Symbol('magicMoveCleanup');
    function captureTokenPositions(container) {
        const map = new Map();
        if (!container) return map;
        const tokens = container.querySelectorAll('.player, .ball');
        tokens.forEach(el => {
            if (!el.dataset || !el.dataset.tokenId) return;
            const rect = el.getBoundingClientRect();
            map.set(el.dataset.tokenId, {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                el
            });
        });
        return map;
    }
    function snapshotSlidePositions(container) {
        if (!container) return new Map();
        const computed = window.getComputedStyle(container);
        const wasHidden = computed.display === 'none';
        let prevDisplay = '';
        let prevVisibility = '';
        let prevPointer = '';
        if (wasHidden) {
            prevDisplay = container.style.display;
            prevVisibility = container.style.visibility;
            prevPointer = container.style.pointerEvents;
            container.style.display = 'block';
            container.style.visibility = 'hidden';
            container.style.pointerEvents = 'none';
        }
        const positions = captureTokenPositions(container);
        if (wasHidden) {
            container.style.display = prevDisplay || 'none';
            container.style.visibility = prevVisibility || '';
            container.style.pointerEvents = prevPointer || '';
        }
        return positions;
    }
    const BASE_MAGIC_MOVE_DURATION_MS = 1500; // base duration at 1.0x
    let magicMoveDurationMs = BASE_MAGIC_MOVE_DURATION_MS; // dynamic, controlled by slider
    function playMagicMove(prevPositions, nextPositions) {
        if (!prevPositions || !prevPositions.size || !nextPositions || !nextPositions.size) return;
        nextPositions.forEach((nextData, tokenId) => {
            const prevData = prevPositions.get(tokenId);
            if (!prevData) return;
            const el = nextData.el;
            if (!el) return;
            const dx = prevData.left - nextData.left;
            const dy = prevData.top - nextData.top;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
            const existingCleanup = el[magicMoveCleanupSymbol];
            if (typeof existingCleanup === 'function') {
                existingCleanup();
            }
            el.classList.add('magic-move-active');
            el.style.transition = 'none';
            el.style.transform = `translate(${dx}px, ${dy}px)`;
            requestAnimationFrame(() => {
                void el.offsetWidth;
                el.style.transition = `transform ${magicMoveDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                el.style.transform = 'translate(0, 0)';
            });
            let timeoutId = null;
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                el.style.transition = '';
                el.style.transform = '';
                el.classList.remove('magic-move-active');
                el.removeEventListener('transitionend', cleanup);
                if (el[magicMoveCleanupSymbol] === cleanup) {
                    delete el[magicMoveCleanupSymbol];
                }
            };
            el[magicMoveCleanupSymbol] = cleanup;
            el.addEventListener('transitionend', cleanup);
            timeoutId = setTimeout(cleanup, magicMoveDurationMs + 120);
        });
    }

    const GIF_WORKER_URL = 'vendor/gif.worker.js';
    const GIF_BACKGROUND = '#01060f';
    const GIF_STILL_DELAY = 900;
    const GIF_MIN_FRAME_DELAY = 40;
    const GIF_CAPTURE_SCALE = 3;
    const GIF_QUALITY = 2;
    const GIF_DITHER = 'FloydSteinberg';
    function waitForAnimationFrame() {
        return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
    async function waitFrames(count = 1) {
        for (let i = 0; i < count; i++) {
            await waitForAnimationFrame();
        }
    }
    function getOrderedSlides() {
        return slides.slice().sort((a, b) => a.id - b.id);
    }
    async function capturePitchFrame(gifInstance, delayMs) {
        if (!gifInstance || !pitchContainer || typeof html2canvas !== 'function') return;
        await waitFrames(1);
        const scale = Math.max(GIF_CAPTURE_SCALE, window.devicePixelRatio || 1);
        const canvas = await html2canvas(pitchContainer, {
            backgroundColor: GIF_BACKGROUND,
            scale,
            useCORS: true,
            logging: false
        });
        gifInstance.addFrame(canvas, {
            delay: Math.max(GIF_MIN_FRAME_DELAY, Math.round(delayMs)),
            copy: true
        });
    }
    async function animateSlideForGif(targetSlideId, gifInstance, options = {}) {
        const frames = Math.max(2, options.frames || 12);
        const frameDelay = Math.max(GIF_MIN_FRAME_DELAY, options.frameDelay || Math.round(magicMoveDurationMs / frames));
        const { prevPositions, nextPositions } = setActiveSlide(targetSlideId, { animate: false, capturePositions: true });
        if (!nextPositions.size) {
            await capturePitchFrame(gifInstance, frameDelay);
            return;
        }
        const entries = [];
        nextPositions.forEach((nextData, tokenId) => {
            const prevData = prevPositions.get(tokenId);
            if (!prevData) return;
            const el = nextData.el;
            if (!el) return;
            entries.push({
                el,
                dx: prevData.left - nextData.left,
                dy: prevData.top - nextData.top,
                prevTransition: el.style.transition || ''
            });
            el.style.transition = 'none';
        });
        if (!entries.length) {
            await capturePitchFrame(gifInstance, frameDelay);
            return;
        }
        try {
            for (let frame = 0; frame < frames; frame++) {
                const progress = frames === 1 ? 1 : frame / (frames - 1);
                entries.forEach(({ el, dx, dy }) => {
                    const remaining = 1 - progress;
                    const currentDx = Math.round(dx * remaining);
                    const currentDy = Math.round(dy * remaining);
                    el.style.transform = `translate(${currentDx}px, ${currentDy}px)`;
                });
                await waitFrames(1);
                await capturePitchFrame(gifInstance, frameDelay);
            }
        } finally {
            entries.forEach(({ el, prevTransition }) => {
                el.style.transform = '';
                el.style.transition = prevTransition;
            });
        }
    }
    function renderGifAsync(gifInstance) {
        return new Promise((resolve, reject) => {
            let settled = false;
            gifInstance.on('finished', (blob) => {
                settled = true;
                resolve(blob);
            });
            gifInstance.on('abort', () => {
                if (!settled) reject(new Error('GIF export aborted'));
            });
            gifInstance.render();
        });
    }
    function downloadGifBlob(blob) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tactical-sequence-${Date.now()}.gif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    function toggleExportButton(isBusy) {
        if (!exportGifBtn) return;
        exportGifBtn.disabled = !!isBusy;
        exportGifBtn.textContent = isBusy ? '•••' : 'GIF';
    }
    async function exportSlidesAsGif() {
        if (isExportingGif) return;
        if (typeof html2canvas !== 'function' || typeof GIF === 'undefined') {
            window.alert('GIF export requires html2canvas and gif.js.');
            return;
        }
        const orderedSlides = getOrderedSlides();
        if (!orderedSlides.length) {
            window.alert('Add at least one slide before exporting.');
            return;
        }
        isExportingGif = true;
        toggleExportButton(true);
        const originalSlideId = activeSlideId || orderedSlides[0].id;
        const transitionFrames = Math.max(6, Math.round(magicMoveDurationMs / 80));
        const transitionDelay = Math.max(GIF_MIN_FRAME_DELAY, Math.round(magicMoveDurationMs / transitionFrames));
        const gifInstance = new GIF({
            workers: 2,
            quality: GIF_QUALITY,
            workerScript: GIF_WORKER_URL,
            background: GIF_BACKGROUND,
            dither: GIF_DITHER
        });
        try {
            setActiveSlide(orderedSlides[0].id, { animate: false });
            await waitFrames(1);
            await capturePitchFrame(gifInstance, GIF_STILL_DELAY);
            for (let i = 1; i < orderedSlides.length; i++) {
                await animateSlideForGif(orderedSlides[i].id, gifInstance, {
                    frames: transitionFrames,
                    frameDelay: transitionDelay
                });
                await capturePitchFrame(gifInstance, GIF_STILL_DELAY);
            }
            const blob = await renderGifAsync(gifInstance);
            downloadGifBlob(blob);
        } catch (err) {
            console.error(err);
            window.alert('Unable to export GIF. Please try again.');
        } finally {
            isExportingGif = false;
            toggleExportButton(false);
            if (originalSlideId != null) {
                setActiveSlide(originalSlideId, { animate: false });
            }
        }
    }
    // -------- Slides (simple tabs) --------
    function renderSlideThumb(id) {
        if (!slidesList) return;
        const existing = slidesList.querySelector(`.slide-thumb[data-slide-id="${id}"]`);
        if (existing) return;
        const thumb = document.createElement('div');
        thumb.className = 'slide-thumb';
        thumb.dataset.slideId = String(id);
        const slide = slides.find(s => s.id === id);
        // Label element
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = slide && slide.title ? slide.title : `Slide ${id}`;
        thumb.appendChild(label);
        // Double-click editing of title
        const beginEdit = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = label.textContent;
            input.className = 'slide-title-input';
            thumb.replaceChild(input, label);
            input.focus();
            input.select();
            const save = () => {
                const newTitle = (input.value || '').trim() || `Slide ${id}`;
                label.textContent = newTitle;
                const s = slides.find(x => x.id === id);
                if (s) s.title = newTitle;
                thumb.replaceChild(label, input);
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') save();
                if (ke.key === 'Escape') {
                    thumb.replaceChild(label, input);
                }
            });
        };
        label.addEventListener('dblclick', beginEdit);
        const close = document.createElement('button');
        close.className = 'close';
        close.textContent = '×';
        close.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSlide(id);
        });
        thumb.appendChild(close);
        thumb.addEventListener('click', () => setActiveSlide(id));
        slidesList.appendChild(thumb);
        updateThumbActive();
    }
    function updateThumbActive() {
        if (!slidesList) return;
        const thumbs = slidesList.querySelectorAll('.slide-thumb');
        thumbs.forEach(t => {
            t.classList.toggle('active', t.dataset.slideId === String(activeSlideId));
        });
    }
    function setActiveSlide(id, options = {}) {
        const { animate = true, capturePositions = false } = options;
        const nextSlide = slides.find(s => s.id === id);
        if (!nextSlide) return { prevPositions: new Map(), nextPositions: new Map() };
        const prevSlide = slides.find(s => s.id === activeSlideId);
        const needPositions = animate || capturePositions;
        const prevPositions = needPositions && prevSlide ? captureTokenPositions(prevSlide.container) : new Map();
        const nextPositions = needPositions ? snapshotSlidePositions(nextSlide.container) : new Map();
        slides.forEach(s => {
            const isActive = s.id === id;
            s.container.style.display = isActive ? 'block' : 'none';
            s.container.style.visibility = '';
            s.container.style.pointerEvents = '';
        });
        activeSlideId = id;
        currentSlideContainer = nextSlide.container;
        if (animate && prevPositions.size && nextPositions.size) {
            playMagicMove(prevPositions, nextPositions);
        }
        updateThumbActive();
        return { prevPositions, nextPositions };
    }
    // ---- Slides autoplay (Play/Pause) ----
    let isPlayingSlides = false;
    let slidePlayTimer = null;
    function getSlidePlayDelayMs() {
        // Leave time to observe the end state
        return Math.max(1000, magicMoveDurationMs + 1100);
    }
    function advanceToNextSlide() {
        if (!slides.length) return;
        const idx = slides.findIndex(s => s.id === activeSlideId);
        const nextIdx = (idx + 1) % slides.length;
        setActiveSlide(slides[nextIdx].id);
    }
    function startSlideShow() {
        if (isPlayingSlides || slides.length <= 1 || isExportingGif) return;
        isPlayingSlides = true;
        if (playSlidesBtn) playSlidesBtn.textContent = 'Pause';
        advanceToNextSlide();
        slidePlayTimer = setInterval(advanceToNextSlide, getSlidePlayDelayMs());
    }
    function stopSlideShow() {
        if (!isPlayingSlides) return;
        isPlayingSlides = false;
        if (playSlidesBtn) playSlidesBtn.textContent = 'Play';
        if (slidePlayTimer) { clearInterval(slidePlayTimer); slidePlayTimer = null; }
    }
    function toggleSlideShow() {
        if (isPlayingSlides) stopSlideShow(); else startSlideShow();
    }
    function addSlide() {
        const id = slides.length ? Math.max(...slides.map(s => s.id)) + 1 : 1;
        const container = document.createElement('div');
        container.className = 'absolute inset-0';
        container.dataset.slideId = String(id);
        container.style.display = 'none';
        playersRoot.appendChild(container);
        slides.push({ id, container, title: `Slide ${id}` });
        // Clone current slide tokens into new slide
        const src = getActiveContainer();
        if (src && src !== container) {
            const items = src.querySelectorAll('.player, .ball');
            items.forEach(node => {
                const clone = node.cloneNode(true);
                ensureTokenId(clone);
                // Reattach behaviors
                if (clone.classList.contains('player')) {
                    clone.draggable = true;
                    // Remove any selected styling in the new slide
                    clone.classList.remove('selected');
                    makeDraggable(clone);
                    // Triple-click/tap delete (no playerCount adjustments)
                    let clickCount = 0;
                    let clickTimer = null;
                    const TRIPLE_DELAY = 400;
                    clone.addEventListener('click', (e) => {
                        e.stopPropagation();
                        clickCount++;
                        if (clickTimer) clearTimeout(clickTimer);
                        clickTimer = setTimeout(() => {
                            if (clickCount === 3) clone.remove();
                            clickCount = 0;
                        }, TRIPLE_DELAY);
                    });
                    clone.addEventListener('touchend', (e) => {
                        e.stopPropagation();
                        clickCount++;
                        if (clickTimer) clearTimeout(clickTimer);
                        clickTimer = setTimeout(() => {
                            if (clickCount === 3) { e.preventDefault(); clone.remove(); }
                            clickCount = 0;
                        }, TRIPLE_DELAY);
                    });
                } else if (clone.classList.contains('ball')) {
                    clone.draggable = true;
                    clone.classList.remove('selected');
                    makeDraggableBallEl(clone);
                    // Triple delete
                    let clickCount = 0;
                    let clickTimer = null;
                    const TRIPLE_DELAY = 400;
                    const handle = (e) => {
                        e.stopPropagation();
                        clickCount++;
                        if (clickTimer) clearTimeout(clickTimer);
                        clickTimer = setTimeout(() => {
                            if (clickCount === 3) clone.remove();
                            clickCount = 0;
                        }, TRIPLE_DELAY);
                    };
                    clone.addEventListener('click', handle);
                    clone.addEventListener('touchend', handle);
                }
                container.appendChild(clone);
            });
        }
        renderSlideThumb(id);
        setActiveSlide(id);
    }
    function deleteSlide(id) {
        const idx = slides.findIndex(s => s.id === id);
        if (idx === -1) return;
        slides[idx].container.remove();
        if (slidesList) {
            const thumb = slidesList.querySelector(`.slide-thumb[data-slide-id="${id}"]`);
            if (thumb) thumb.remove();
        }
        slides.splice(idx, 1);
        if (!slides.length) {
            addSlide();
        } else {
            const next = slides[Math.max(0, idx - 1)];
            setActiveSlide(next.id);
        }
    }
    // Initialize first slide (wrap any existing children into slide 1)
    (function initSlides() {
        if (!playersRoot) return;
        const first = document.createElement('div');
        first.className = 'absolute inset-0';
        first.dataset.slideId = '1';
        while (playersRoot.firstChild) {
            first.appendChild(playersRoot.firstChild);
        }
        playersRoot.appendChild(first);
        first.querySelectorAll('.player, .ball').forEach(ensureTokenId);
        slides.push({ id: 1, container: first, title: 'Slide 1' });
        currentSlideContainer = first;
        activeSlideId = 1;
        renderSlideThumb(1);
        updateThumbActive();
        if (addSlideBtn) {
            addSlideBtn.addEventListener('click', () => addSlide());
        }
    })();
    if (playSlidesBtn) {
        playSlidesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSlideShow();
        });
    }
    // Pause playback when tab becomes hidden or when exporting
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopSlideShow();
    });
    // Animation speed control
    function updateAnimationSpeedFromUI() {
        if (!speedSlider) return;
        const factor = parseFloat(speedSlider.value || '1') || 1;
        magicMoveDurationMs = Math.round(BASE_MAGIC_MOVE_DURATION_MS / factor);
        if (speedValueEl) speedValueEl.textContent = `${factor.toFixed(1)}x`;
        if (isPlayingSlides) {
            if (slidePlayTimer) { clearInterval(slidePlayTimer); slidePlayTimer = null; }
            slidePlayTimer = setInterval(advanceToNextSlide, getSlidePlayDelayMs());
        }
    }
    if (speedSlider) {
        speedSlider.addEventListener('input', updateAnimationSpeedFromUI);
        speedSlider.addEventListener('change', updateAnimationSpeedFromUI);
        // initialize
        updateAnimationSpeedFromUI();
    }
    if (exportGifBtn) {
        exportGifBtn.addEventListener('click', () => {
            stopSlideShow();
            exportSlidesAsGif();
        });
    }
});
