// Game Data
const gameData = {
  levels: [
    {
      level: 1,
      hasTimer: false,
      pathWidth: 40,
      timerSeconds: 0,
      moveSpeed: 2,
      maze: "Simple maze with wide paths for introduction",
      difficulty: "Easy - Wide paths, simple layout, slower movement"
    },
    {
      level: 2,
      hasTimer: false,
      pathWidth: 35,
      timerSeconds: 0,
      moveSpeed: 2,
      maze: "Slightly more complex with narrow paths",
      difficulty: "Easy-Medium - Narrower paths, basic turns, slower movement"
    },
    {
      level: 3,
      hasTimer: false,
      pathWidth: 30,
      timerSeconds: 0,
      moveSpeed: 2,
      maze: "More complex routing required",
      difficulty: "Medium - Complex layout, multiple paths, slower movement"
    },
    {
      level: 4,
      hasTimer: true,
      pathWidth: 25,
      timerSeconds: 45,
      moveSpeed: 2,
      maze: "Narrow paths with timer pressure",
      difficulty: "Hard - Timer active, narrow paths, slower movement"
    },
    {
      level: 5,
      hasTimer: true,
      pathWidth: 22,
      timerSeconds: 35,
      moveSpeed: 2,
      maze: "Very narrow with complex routing",
      difficulty: "Hard - Faster timer, very narrow paths, slower movement"
    },
    {
      level: 6,
      hasTimer: true,
      pathWidth: 18,
      timerSeconds: 30,
      moveSpeed: 2,
      maze: "Extremely narrow with death penalty",
      difficulty: "Extreme - Death sends back 2 levels, slower movement"
    },
    {
      level: 7,
      hasTimer: true,
      pathWidth: 15,
      timerSeconds: 25,
      moveSpeed: 2,
      maze: "Final challenge - most difficult",
      difficulty: "Nightmare - Ultimate challenge, slower movement"
    }
  ],
  hauntingMessages: [
    "The walls are watching...",
    "The blood remembers your mistakes...",
    "Fall once, and you'll lose everything.",
    "You're moving too slow...",
    "The darkness grows hungry...",
    "Your fear feeds the maze...",
    "Turn back while you still can...",
    "The exit is just an illusion..."
  ],
  subliminalMessages: [
    "Give up...",
    "You're too slow...",
    "Failure...",
    "Hopeless...",
    "Turn back...",
    "You can't win..."
  ],
  colors: {
    background: "#0a0a0a",
    mazeWall: "#1a1a1a",
    mazeWallGlow: "#8B0000",
    player: "#ffffff",
    playerGlow: "#ffffff",
    textPrimary: "#DC143C",
    textSecondary: "#8B0000",
    uiAccent: "#660000"
  }
};

// Game State
class GameState {
  constructor() {
    this.currentLevel = 1;
    this.isPlaying = false;
    this.isPaused = false;
    this.playerPosition = { x: 0, y: 0 };
    this.playerVelocity = { x: 0, y: 0 };
    this.moveSpeed = 1.0; // Reduced from 2.5 to 1.0 for slower movement
    this.maze = [];
    this.canvas = null;
    this.ctx = null;
    this.playerElement = null;
    this.timer = 0;
    this.timerInterval = null;
    this.hauntingMessageTimer = null;
    this.subliminalTimer = null;
    this.canvasWidth = 800;
    this.canvasHeight = 600;
    this.cellSize = 20;
    this.mazeWidth = 0;
    this.mazeHeight = 0;
    this.keys = {};
    this.lastTouchPos = null;
    this.touchStartPos = null;
    this.animationFrameId = null;
  }


  // LocalStorage methods for saving/loading progress
  saveProgress() {
    try {
      const saveData = {
        currentLevel: this.currentLevel,
        playerPosition: { x: this.playerPosition.x, y: this.playerPosition.y },
        timer: this.timer,
        timestamp: Date.now()
      };
      localStorage.setItem('mazeHorrorProgress', JSON.stringify(saveData));
      console.log('Progress saved:', saveData);
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('mazeHorrorProgress');
      if (saved) {
        const saveData = JSON.parse(saved);
        // Check if save is not too old (optional: 7 days)
        const daysSinceSave = (Date.now() - saveData.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceSave < 7) {
          console.log('Progress loaded:', saveData);
          return saveData;
        }
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
    return null;
  }

  clearProgress() {
    try {
      localStorage.removeItem('mazeHorrorProgress');
      console.log('Progress cleared');
    } catch (e) {
      console.error('Failed to clear progress:', e);
    }
  }

  init() {
    // Try to load saved progress
    const savedProgress = this.loadProgress();
    if (savedProgress) {
      // Ask user if they want to resume
      const resume = confirm('Resume previous progress from Level ' + savedProgress.currentLevel + '?');
      if (resume) {
        this.currentLevel = savedProgress.currentLevel;
        this.timer = savedProgress.timer;
        // playerPosition will be set after maze generation
      } else {
        this.clearProgress();
        this.currentLevel = 1;
      }
    }

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.playerElement = document.getElementById('player');
    
    // Set canvas size based on screen
    this.adjustCanvasSize();
    window.addEventListener('resize', () => this.adjustCanvasSize());
    
    this.setupEventListeners();
    
    // Show intro screen initially
    this.showScreen('intro-screen');
  }

  adjustCanvasSize() {
    const maxWidth = Math.min(window.innerWidth * 0.9, 800);
    const maxHeight = Math.min(window.innerHeight * 0.8, 600);
    
    this.canvasWidth = maxWidth;
    this.canvasHeight = maxHeight;
    
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    
    // Adjust cell size based on canvas size
    this.cellSize = Math.max(15, Math.min(25, this.canvasWidth / 40));
    this.mazeWidth = Math.floor(this.canvasWidth / this.cellSize);
    this.mazeHeight = Math.floor(this.canvasHeight / this.cellSize);
    
    if (this.isPlaying) {
      this.generateMaze();
      this.draw();
    }
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Touch controls - Reduced sensitivity for slower movement
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchStartPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      this.lastTouchPos = { ...this.touchStartPos };
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchStartPos || !this.isPlaying) return;
      
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const currentPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      
      // Calculate swipe direction with reduced sensitivity
      const deltaX = currentPos.x - this.touchStartPos.x;
      const deltaY = currentPos.y - this.touchStartPos.y;
      
      const threshold = 20; // Reduced from 30 for more precise control
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          this.playerVelocity.x = deltaX > 0 ? this.moveSpeed * 0.7 : -this.moveSpeed * 0.7; // Reduced multiplier
          this.playerVelocity.y *= 0.9;
        } else {
          this.playerVelocity.y = deltaY > 0 ? this.moveSpeed * 0.7 : -this.moveSpeed * 0.7; // Reduced multiplier
          this.playerVelocity.x *= 0.9;
        }
        this.touchStartPos = currentPos;
      }
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchStartPos = null;
      this.lastTouchPos = null;
    });

    // Mouse controls (for desktop) - Reduced sensitivity
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isPlaying) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const playerScreenX = this.playerPosition.x;
      const playerScreenY = this.playerPosition.y;
      
      const deltaX = mouseX - playerScreenX;
      const deltaY = mouseY - playerScreenY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 80) { // Increased threshold for less sensitive mouse movement
        this.playerVelocity.x = (deltaX / distance) * this.moveSpeed * 0.6; // Reduced multiplier
        this.playerVelocity.y = (deltaY / distance) * this.moveSpeed * 0.6; // Reduced multiplier
      }
    });
  }

  generateMaze() {
    const level = gameData.levels[this.currentLevel - 1];
    const pathWidth = Math.max(1, Math.floor(level.pathWidth / this.cellSize));
    
    // Initialize maze with walls
    this.maze = [];
    for (let y = 0; y < this.mazeHeight; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.mazeWidth; x++) {
        this.maze[y][x] = 1; // 1 = wall, 0 = path
      }
    }

    // Generate maze paths based on level complexity
    this.generateMazePaths(pathWidth);
    
    // Set start position (top-left area)
    const startX = pathWidth + 2;
    const startY = pathWidth + 2;
    this.playerPosition.x = startX * this.cellSize + this.cellSize / 2;
    this.playerPosition.y = startY * this.cellSize + this.cellSize / 2;
    
    // Ensure start area is clear
    for (let y = 0; y < startY + pathWidth + 2; y++) {
      for (let x = 0; x < startX + pathWidth + 2; x++) {
        if (y < this.mazeHeight && x < this.mazeWidth && y >= 0 && x >= 0) {
          this.maze[y][x] = 0;
        }
      }
    }
    
    // Clear end area
    for (let y = this.mazeHeight - pathWidth - 3; y < this.mazeHeight; y++) {
      for (let x = this.mazeWidth - pathWidth - 3; x < this.mazeWidth; x++) {
        if (y >= 0 && x >= 0 && y < this.mazeHeight && x < this.mazeWidth) {
          this.maze[y][x] = 0;
        }
      }
    }
  }

  generateMazePaths(pathWidth) {
    const level = this.currentLevel;
    
    // Create main path from start to end
    const endX = this.mazeWidth - pathWidth - 3;
    const endY = this.mazeHeight - pathWidth - 3;
    
    if (level === 1) {
      this.createStraightPath(pathWidth, endX, endY);
    } else if (level === 2) {
      this.createLShapedPath(pathWidth, endX, endY);
    } else if (level === 3) {
      this.createSShapedPath(pathWidth, endX, endY);
    } else if (level >= 4 && level <= 5) {
      this.createZigzagPath(pathWidth, endX, endY);
    } else if (level >= 6) {
      this.createComplexMaze(pathWidth, endX, endY);
    }
    
    // Add dead ends for higher levels
    if (level >= 3) {
      this.addDeadEnds(pathWidth);
    }
  }

  createStraightPath(pathWidth, endX, endY) {
    let currentX = pathWidth + 2;
    let currentY = pathWidth + 2;
    
    while (currentX < endX || currentY < endY) {
      this.carvePath(currentX, currentY, pathWidth);
      
      if (currentX < endX) currentX++;
      if (currentY < endY && Math.random() > 0.7) currentY++;
      if (currentY > pathWidth + 2 && Math.random() > 0.8) currentY--;
    }
    
    this.carvePath(endX, endY, pathWidth);
  }

  createLShapedPath(pathWidth, endX, endY) {
    let currentX = pathWidth + 2;
    let currentY = pathWidth + 2;
    const turnPointX = Math.floor(this.mazeWidth * 0.6);
    
    while (currentX < turnPointX) {
      this.carvePath(currentX, currentY, pathWidth);
      currentX++;
    }
    
    while (currentY < endY) {
      this.carvePath(currentX, currentY, pathWidth);
      currentY++;
    }
    
    while (currentX < endX) {
      this.carvePath(currentX, currentY, pathWidth);
      currentX++;
    }
  }

  createSShapedPath(pathWidth, endX, endY) {
    let currentX = pathWidth + 2;
    let currentY = pathWidth + 2;
    const midY = Math.floor(this.mazeHeight / 2);
    
    while (currentX < this.mazeWidth * 0.8) {
      this.carvePath(currentX, currentY, pathWidth);
      currentX++;
    }
    
    while (currentY < midY) {
      this.carvePath(currentX, currentY, pathWidth);
      currentY++;
    }
    
    while (currentX > this.mazeWidth * 0.2) {
      this.carvePath(currentX, currentY, pathWidth);
      currentX--;
    }
    
    while (currentY < endY) {
      this.carvePath(currentX, currentY, pathWidth);
      currentY++;
    }
    
    while (currentX < endX) {
      this.carvePath(currentX, currentY, pathWidth);
      currentX++;
    }
  }

  createZigzagPath(pathWidth, endX, endY) {
    let currentX = pathWidth + 2;
    let currentY = pathWidth + 2;
    let direction = 1;
    
    while (currentY < endY) {
      const targetX = direction > 0 ? this.mazeWidth - pathWidth - 3 : pathWidth + 2;
      while ((direction > 0 && currentX < targetX) || (direction < 0 && currentX > targetX)) {
        this.carvePath(currentX, currentY, pathWidth);
        currentX += direction;
      }
      
      const segmentHeight = Math.floor(this.mazeHeight / 6);
      const targetY = Math.min(currentY + segmentHeight, endY);
      while (currentY < targetY) {
        this.carvePath(currentX, currentY, pathWidth);
        currentY++;
      }
      
      direction *= -1;
    }
    
    while ((endX > currentX && currentX < endX) || (endX < currentX && currentX > endX)) {
      this.carvePath(currentX, currentY, pathWidth);
      currentX += endX > currentX ? 1 : -1;
    }
  }

  createComplexMaze(pathWidth, endX, endY) {
    const checkpoints = [
      { x: Math.floor(this.mazeWidth * 0.3), y: Math.floor(this.mazeHeight * 0.2) },
      { x: Math.floor(this.mazeWidth * 0.7), y: Math.floor(this.mazeHeight * 0.4) },
      { x: Math.floor(this.mazeWidth * 0.2), y: Math.floor(this.mazeHeight * 0.6) },
      { x: Math.floor(this.mazeWidth * 0.8), y: Math.floor(this.mazeHeight * 0.8) }
    ];
    
    let currentX = pathWidth + 2;
    let currentY = pathWidth + 2;
    
    checkpoints.forEach(checkpoint => {
      currentX = this.createPathTo(currentX, currentY, checkpoint.x, checkpoint.y, pathWidth);
      currentY = checkpoint.y;
    });
    
    this.createPathTo(currentX, currentY, endX, endY, pathWidth);
  }

  createPathTo(fromX, fromY, toX, toY, pathWidth) {
    let currentX = fromX;
    let currentY = fromY;
    
    while (currentX !== toX || currentY !== toY) {
      this.carvePath(currentX, currentY, pathWidth);
      
      if (currentX < toX) currentX++;
      else if (currentX > toX) currentX--;
      else if (currentY < toY) currentY++;
      else if (currentY > toY) currentY--;
    }
    
    this.carvePath(toX, toY, pathWidth);
    return currentX;
  }

  carvePath(x, y, width) {
    for (let dy = 0; dy < width; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const newX = x + dx;
        const newY = y + dy;
        if (newX < this.mazeWidth && newY < this.mazeHeight && newX >= 0 && newY >= 0) {
          this.maze[newY][newX] = 0;
        }
      }
    }
  }

  addDeadEnds(pathWidth) {
    const numDeadEnds = Math.floor(this.currentLevel * 2);
    for (let i = 0; i < numDeadEnds; i++) {
      const startX = Math.floor(Math.random() * (this.mazeWidth - pathWidth * 4)) + pathWidth * 2;
      const startY = Math.floor(Math.random() * (this.mazeHeight - pathWidth * 4)) + pathWidth * 2;
      const length = Math.floor(Math.random() * 8) + 3;
      
      let currentX = startX;
      let currentY = startY;
      const direction = Math.floor(Math.random() * 4);
      
      for (let j = 0; j < length; j++) {
        this.carvePath(currentX, currentY, pathWidth);
        
        switch (direction) {
          case 0: currentY--; break;
          case 1: currentX++; break;
          case 2: currentY++; break;
          case 3: currentX--; break;
        }
        
        if (currentX < 0 || currentX >= this.mazeWidth || currentY < 0 || currentY >= this.mazeHeight) {
          break;
        }
      }
    }
  }

  update() {
    if (!this.isPlaying || this.isPaused) return;
    
    this.updatePlayerMovement();
    this.checkCollisions();
    this.checkWinCondition();
    this.updatePlayer();
    this.draw();
    
    this.animationFrameId = requestAnimationFrame(() => this.update());
  }

  updatePlayerMovement() {
    // Handle keyboard input with reduced speed
    if (this.keys['ArrowUp'] || this.keys['KeyW']) {
      this.playerVelocity.y = -this.moveSpeed;
    }
    if (this.keys['ArrowDown'] || this.keys['KeyS']) {
      this.playerVelocity.y = this.moveSpeed;
    }
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.playerVelocity.x = -this.moveSpeed;
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.playerVelocity.x = this.moveSpeed;
    }
    
    // Continuous movement - if no input, maintain some movement but slower
    if (Math.abs(this.playerVelocity.x) < 0.05 && Math.abs(this.playerVelocity.y) < 0.05) {
      if (this.playerVelocity.x === 0 && this.playerVelocity.y === 0) {
        this.playerVelocity.x = this.moveSpeed * 0.2; // Reduced from 0.3 to 0.2
      }
    }
    
    // Update position
    const newX = this.playerPosition.x + this.playerVelocity.x;
    const newY = this.playerPosition.y + this.playerVelocity.y;
    
    // Keep player within canvas bounds
    this.playerPosition.x = Math.max(10, Math.min(this.canvasWidth - 10, newX));
    this.playerPosition.y = Math.max(10, Math.min(this.canvasHeight - 10, newY));
    
    // Apply more friction for slower, more controlled movement
    this.playerVelocity.x *= 0.95; // Increased friction from 0.92 to 0.95
    this.playerVelocity.y *= 0.95; // Increased friction from 0.92 to 0.95
  }

  checkCollisions() {
    const playerRadius = 8;
    const gridX = Math.floor(this.playerPosition.x / this.cellSize);
    const gridY = Math.floor(this.playerPosition.y / this.cellSize);
    
    // Check surrounding cells for walls
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = gridX + dx;
        const checkY = gridY + dy;
        
        if (checkX >= 0 && checkX < this.mazeWidth && checkY >= 0 && checkY < this.mazeHeight) {
          if (this.maze[checkY] && this.maze[checkY][checkX] === 1) {
            const wallLeft = checkX * this.cellSize;
            const wallRight = (checkX + 1) * this.cellSize;
            const wallTop = checkY * this.cellSize;
            const wallBottom = (checkY + 1) * this.cellSize;
            
            // Check if player overlaps with wall
            if (this.playerPosition.x + playerRadius > wallLeft &&
                this.playerPosition.x - playerRadius < wallRight &&
                this.playerPosition.y + playerRadius > wallTop &&
                this.playerPosition.y - playerRadius < wallBottom) {
              this.playerDeath();
              return;
            }
          }
        }
      }
    }
    
    // Check canvas boundaries
    if (this.playerPosition.x - playerRadius < 0 || 
        this.playerPosition.x + playerRadius > this.canvasWidth ||
        this.playerPosition.y - playerRadius < 0 || 
        this.playerPosition.y + playerRadius > this.canvasHeight) {
      this.playerDeath();
    }
  }

  checkWinCondition() {
    const endZoneSize = 60;
    const endX = this.canvasWidth - endZoneSize;
    const endY = this.canvasHeight - endZoneSize;
    
    if (this.playerPosition.x > endX && this.playerPosition.y > endY) {
      this.completeLevel();
    }
  }

  completeLevel() {
    this.isPlaying = false;
    this.stopTimer();
    this.saveProgress();
    this.stopMessages();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.currentLevel >= 7) {
      this.showVictory();
    } else {
      this.currentLevel++;
      setTimeout(() => {
        this.startLevel();
      }, 1000);
    }
  }

  playerDeath() {
    this.isPlaying = false;
    this.stopTimer();
    this.saveProgress();
    this.stopMessages();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Death penalty for levels 6+
    if (this.currentLevel >= 6) {
      this.currentLevel = Math.max(1, this.currentLevel - 2);
      document.getElementById('penalty-message').classList.remove('hidden');
    } else {
      document.getElementById('penalty-message').classList.add('hidden');
    }
    
    document.getElementById('death-level').textContent = this.currentLevel;
    this.showScreen('death-screen');
  }

  updatePlayer() {
    // Fixed positioning to use canvas position correctly
    if (this.canvas && this.playerElement) {
      const rect = this.canvas.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      const playerScreenX = rect.left + scrollX + this.playerPosition.x - 6;
      const playerScreenY = rect.top + scrollY + this.playerPosition.y - 6;
      
      this.playerElement.style.left = playerScreenX + 'px';
      this.playerElement.style.top = playerScreenY + 'px';
      this.playerElement.style.position = 'absolute';
      this.playerElement.style.display = 'block';
      this.playerElement.style.zIndex = '15';
    }
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = gameData.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw maze
    this.ctx.fillStyle = gameData.colors.mazeWall;
    this.ctx.strokeStyle = gameData.colors.mazeWallGlow;
    this.ctx.lineWidth = 2;
    
    for (let y = 0; y < this.mazeHeight; y++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        if (this.maze[y] && this.maze[y][x] === 1) {
          const drawX = x * this.cellSize;
          const drawY = y * this.cellSize;
          
          this.ctx.fillRect(drawX, drawY, this.cellSize, this.cellSize);
          this.ctx.strokeRect(drawX, drawY, this.cellSize, this.cellSize);
        }
      }
    }
    
    // Draw end zone
    this.ctx.fillStyle = 'rgba(220, 20, 60, 0.4)';
    this.ctx.fillRect(this.canvasWidth - 60, this.canvasHeight - 60, 60, 60);
    this.ctx.strokeStyle = gameData.colors.textPrimary;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(this.canvasWidth - 60, this.canvasHeight - 60, 60, 60);
    
    // Draw goal text
    this.ctx.fillStyle = gameData.colors.textPrimary;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('EXIT', this.canvasWidth - 30, this.canvasHeight - 25);
  }

  startLevel() {
    document.getElementById('current-level').textContent = this.currentLevel;
    
    const level = gameData.levels[this.currentLevel - 1];
    
    // Setup timer
    if (level.hasTimer) {
      this.timer = level.timerSeconds;
      this.startTimer();
      document.getElementById('timer-container').classList.remove('hidden');
      document.getElementById('timer').textContent = this.timer;
    } else {
      document.getElementById('timer-container').classList.add('hidden');
      this.stopTimer();
    }
    
    // Start haunting messages for level 4+
    if (this.currentLevel >= 4) {
      this.startHauntingMessages();
      this.startSubliminalMessages();
    }
    
    this.generateMaze();
    this.isPlaying = true;
    this.playerVelocity = { x: 0.5, y: 0 }; // Reduced initial velocity for slower start
    this.showScreen('game-screen');
    this.update();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timer--;
      document.getElementById('timer').textContent = this.timer;
      
      if (this.timer <= 0) {
        this.playerDeath();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startHauntingMessages() {
    const showMessage = () => {
      if (!this.isPlaying) return;
      
      const message = gameData.hauntingMessages[Math.floor(Math.random() * gameData.hauntingMessages.length)];
      const messageEl = document.getElementById('haunting-message');
      
      messageEl.textContent = message;
      messageEl.classList.remove('hidden');
      
      setTimeout(() => {
        messageEl.classList.add('hidden');
      }, 3000);
    };
    
    this.hauntingMessageTimer = setInterval(showMessage, 8000 + Math.random() * 7000);
  }

  startSubliminalMessages() {
    const showSubliminal = () => {
      if (!this.isPlaying) return;
      
      const message = gameData.subliminalMessages[Math.floor(Math.random() * gameData.subliminalMessages.length)];
      const flashEl = document.getElementById('subliminal-flash');
      
      flashEl.textContent = message;
      flashEl.classList.remove('hidden');
      
      setTimeout(() => {
        flashEl.classList.add('hidden');
      }, 200);
    };
    
    this.subliminalTimer = setInterval(showSubliminal, 15000 + Math.random() * 20000);
  }

  stopMessages() {
    if (this.hauntingMessageTimer) {
      clearInterval(this.hauntingMessageTimer);
      this.hauntingMessageTimer = null;
    }
    if (this.subliminalTimer) {
      clearInterval(this.subliminalTimer);
      this.subliminalTimer = null;
    }
    
    document.getElementById('haunting-message').classList.add('hidden');
    document.getElementById('subliminal-flash').classList.add('hidden');
  }

  showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Show target screen
    setTimeout(() => {
      document.getElementById(screenId).classList.add('active');
    }, 100);
  }

  showVictory() {
    this.showScreen('victory-screen');
  }

  restart() {
    this.clearProgress();
    this.isPlaying = false;
    this.stopTimer();
    this.stopMessages();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.playerVelocity = { x: 0, y: 0 };
    this.keys = {};
    this.startLevel();
  }

  resetGame() {
    this.clearProgress();
    this.currentLevel = 1;
    this.restart();
  }
}

// Initialize game
const game = new GameState();

// Event listeners
document.getElementById('enter-maze-btn').addEventListener('click', () => {
  game.startLevel();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  game.restart();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  game.resetGame();
});

// Initialize when page loads
window.addEventListener('load', () => {
  game.init();
});