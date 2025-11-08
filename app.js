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
    function getActiveContainer() {
        return currentSlideContainer || playersRoot;
    }
    
    // Drawing removed
    // Standalone draggable for 15px ball elements
    function makeDraggableBallEl(element) {
        const ballSize = 15;
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
            const cx = el.offsetLeft + 12.5;
            const cy = el.offsetTop + 12.5;
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
    
    // Helper function to get black-box boundaries (player playable area)
    function getBlackBoxBounds() {
        const blackBox = document.getElementById('black-box');
        if (!blackBox) {
            // Fallback to pitch boundaries if black-box doesn't exist
        const pitchImg = document.querySelector('#pitch-container img');
        const rect = pitchImg.getBoundingClientRect();
        const containerRect = pitchContainer.getBoundingClientRect();
            const pitchAspect = 1320 / 2868;
        let pitchWidth, pitchHeight, pitchX, pitchY;
        
        if (rect.width / rect.height > pitchAspect) {
            pitchHeight = rect.height;
            pitchWidth = pitchHeight * pitchAspect;
            pitchX = rect.left + (rect.width - pitchWidth) / 2;
            pitchY = rect.top;
        } else {
            pitchWidth = rect.width;
            pitchHeight = pitchWidth / pitchAspect;
            pitchX = rect.left;
            pitchY = rect.top + (rect.height - pitchHeight) / 2;
        }
        
            return {
                minX: pitchX,
                maxX: pitchX + pitchWidth,
                minY: pitchY,
                maxY: pitchY + pitchHeight,
                width: pitchWidth,
                height: pitchHeight
            };
        }
        
        const blackBoxRect = blackBox.getBoundingClientRect();
        const containerRect = pitchContainer.getBoundingClientRect();
        
        return {
            minX: blackBoxRect.left,
            maxX: blackBoxRect.right,
            minY: blackBoxRect.top,
            maxY: blackBoxRect.bottom,
            width: blackBoxRect.width,
            height: blackBoxRect.height
        };
    }
    
    // Add player function with boundary checking
    function addPlayer(x, y, isOpposition = false) {
        // Enforce 11-player team limit
        if (getTeamCount(isOpposition) >= 11) return;
        const player = document.createElement('div');
        player.className = `player ${isOpposition ? 'opposition' : ''}`;
        player.draggable = true;
        
        // Get black-box boundaries (player playable area)
        const bounds = getBlackBoxBounds();
        const containerRect = pitchContainer.getBoundingClientRect();
        
        // Adjust x, y to be within black-box boundaries
        const playerSize = 25; // Should match the CSS size
        const adjustedX = Math.max(bounds.minX - containerRect.left, Math.min(x, bounds.maxX - playerSize - containerRect.left));
        const adjustedY = Math.max(bounds.minY - containerRect.top, Math.min(y, bounds.maxY - playerSize - containerRect.top));
        
        // Use adjusted positions
        x = adjustedX;
        y = adjustedY;
        
        // Position the player at the clicked coordinates (centered)
        const playerX = x - 12.5; // Half of player width (25px)
        const playerY = y - 12.5; // Half of player height (25px)
        
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
        
        // Get black-box boundaries (player playable area)
        const bounds = getBlackBoxBounds();
        const containerRect = pitchContainer.getBoundingClientRect();
        
        // Dimensions for ball
        const ballSize = 15; // 15x15 per requirement
        
        // If no coordinates provided, place at center
        if (typeof x !== 'number' || typeof y !== 'number') {
            x = bounds.minX - containerRect.left + (bounds.width / 2);
            y = bounds.minY - containerRect.top + (bounds.height / 2);
        }
        
        // Clamp within bounds
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
        const playerSize = 25; // Should match the CSS size
        
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
        
        function getPitchBounds() {
            // Use black-box boundaries for player movement constraints
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
        const offsetX = bounds.minX - containerRect.left;
        const offsetY = bounds.minY - containerRect.top;
        const preset = getFormationPreset(formation);
        
        function toCoordsHalf(pos) {
            const yNorm = side === 'top' ? pos.y : (1 - pos.y); // mirror vertically for bottom half
            const baseY = side === 'top' ? offsetY : offsetY + halfHeight;
            return {
                x: offsetX + pos.x * pitchWidth,
                y: baseY + yNorm * halfHeight
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
            const cp = toCoordsHalf(pos);
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
        const rect = pitchContainer.getBoundingClientRect();
        const x = rect.width / 2;
        const y = rect.height / 2;
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
    // Helper function to check if point is within black-box
    function isPointInBlackBox(x, y) {
        const bounds = getBlackBoxBounds();
        const containerRect = pitchContainer.getBoundingClientRect();
        const relativeX = x - containerRect.left;
        const relativeY = y - containerRect.top;
        const blackBoxRelativeX = bounds.minX - containerRect.left;
        const blackBoxRelativeY = bounds.minY - containerRect.top;
        
        return relativeX >= blackBoxRelativeX && 
               relativeX <= blackBoxRelativeX + bounds.width &&
               relativeY >= blackBoxRelativeY && 
               relativeY <= blackBoxRelativeY + bounds.height;
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
            startX = e.clientX - cr.left;
            startY = e.clientY - cr.top;
            isSelecting = true;
            moved = false;
            rectEl.style.display = 'block';
            updateSelectionRect(startX, startY, startX, startY);
            // while selecting, do not add players on click
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;
            const cr = pitchContainer.getBoundingClientRect();
            const x = e.clientX - cr.left;
            const y = e.clientY - cr.top;
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
    // Add player on pitch click (only within black-box area)
    pitchContainer.addEventListener('click', (e) => {
        // Only add player if clicking directly on the pitch/black-box, not on a player
        if (e.target === pitchContainer || e.target.id === 'pitch-container' || e.target.id === 'black-box') {
            // Check if click is within black-box boundaries
            if (isPointInBlackBox(e.clientX, e.clientY)) {
            const rect = pitchContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            addPlayer(x, y, false);
            }
        }
    });
    
    // Add touch support for mobile (only within black-box area)
    pitchContainer.addEventListener('touchend', (e) => {
        // Only add player if touching the pitch/black-box, not a player
        if (e.target === pitchContainer || e.target.id === 'pitch-container' || e.target.id === 'black-box') {
            e.preventDefault();
            const touch = e.changedTouches[0];
            // Check if touch is within black-box boundaries
            if (isPointInBlackBox(touch.clientX, touch.clientY)) {
            const rect = pitchContainer.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            addPlayer(x, y, false);
            }
        }
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
    
    // Function to update black box position to align with pitch lines
    function updateBlackBoxPosition() {
        const blackBox = document.getElementById('black-box');
        if (!blackBox) return;
        
        const pitchImg = document.querySelector('#pitch-container img');
        if (!pitchImg) return;
        
        const rect = pitchImg.getBoundingClientRect();
        const containerRect = pitchContainer.getBoundingClientRect();
        const pitchAspect = 1320 / 2868;
        
        let pitchWidth, pitchHeight, pitchX, pitchY;
        
        // Calculate the visible pitch area (same logic as used for players)
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
        
        // Pixel-based offset adjustments
        // Adjust these values to fine-tune positioning (in pixels):
        const offsetLeft = -19;    // Move right (positive) or left (negative)
        const offsetTop = -183;    // Move down (positive) or up (negative)
        const offsetRight = 0;  // Move left (positive) or right (negative) - if using right property
        const offsetBottom = 30; // Move up (positive) or down (negative) - if using bottom property
        
        const blackBoxWidth = 375;
        const blackBoxHeight = 620;
        
        // Position using left and top with pixel offsets
        // Base position: right edge aligns with right edge of pitch, bottom edge aligns with bottom edge
        blackBox.style.left = `${pitchX + pitchWidth - blackBoxWidth + offsetLeft}px`;
        blackBox.style.top = `${pitchY + pitchHeight - blackBoxHeight + offsetTop}px`;
        
        // Alternative: Use right and bottom properties instead
        // Uncomment these and comment out the left/top lines above to use:
        // blackBox.style.right = `${containerRect.width - (pitchX + pitchWidth) + offsetRight}px`;
        // blackBox.style.bottom = `${containerRect.height - (pitchY + pitchHeight) + offsetBottom}px`;
    }
    
    // Update black box position on load and resize
    window.addEventListener('load', updateBlackBoxPosition);
    window.addEventListener('resize', updateBlackBoxPosition);
    
    // Also update when the image loads
    if (pitchImg.complete) {
        updateBlackBoxPosition();
    } else {
        pitchImg.addEventListener('load', updateBlackBoxPosition);
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
    function setActiveSlide(id) {
        if (activeSlideId === id) return;
        slides.forEach(s => {
            s.container.style.display = (s.id === id) ? 'block' : 'none';
        });
        activeSlideId = id;
        const slide = slides.find(s => s.id === id);
        currentSlideContainer = slide ? slide.container : null;
        updateThumbActive();
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
        slides.push({ id: 1, container: first, title: 'Slide 1' });
        currentSlideContainer = first;
        activeSlideId = 1;
        renderSlideThumb(1);
        updateThumbActive();
        if (addSlideBtn) {
            addSlideBtn.addEventListener('click', () => addSlide());
        }
    })();
});
