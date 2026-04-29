let spores = [];
let pendingSpores = [];

let gameState = "title";
let selectedLevel = 1;
let highestUnlockedLevel = 1;

let startTime;
let lastClickTime;

let idleDelay = 3000;
let idleGrowthRate = 3.00;
let maxIdleMultiplier = 5.00;

let levels = {
  1: {
    name: "Infestation 1",
    surviveTime: 45,
    baseSpreadRate: 0.0020,
    maxSpores: 90,
    lowSporeClusterChance: 0.006,
    spreadGrowth: 1.006,
    maxSpreadCap: 0.028,
    panicLimit: 55
  },
  2: {
    name: "Infestation 2",
    surviveTime: 55,
    baseSpreadRate: 0.0027,
    maxSpores: 95,
    lowSporeClusterChance: 0.009,
    spreadGrowth: 1.005,
    maxSpreadCap: 0.033,
    panicLimit: 70
  },
  3: {
    name: "Infestation 3",
    surviveTime: 65,
    baseSpreadRate: 0.0031,
    maxSpores: 100,
    lowSporeClusterChance: 0.011,
    spreadGrowth: 1.006,
    maxSpreadCap: 0.034,
    panicLimit: 75
  }
};

function setup() {
  createCanvas(800, 600);
  textAlign(CENTER, CENTER);
}

function draw() {
  background(40);

  if (gameState === "title") {
    drawTitleScreen();
  } else if (gameState === "start") {
    drawLevelSelectScreen();
  } else if (gameState === "playing") {
    playGame();
  } else if (gameState === "win") {
    drawWinScreen();
  } else if (gameState === "lose") {
    drawLoseScreen();
  }

  if (gameState === "title" && key === ' ') {
    gameState = "start";
  }

  if (
    (key === 'r' || key === 'R') &&
    (gameState === "playing" || gameState === "lose" || gameState === "win")
  ) {
    gameState = "start";
  }

  if (gameState === "lose" && key === ' ') {
    startGame(selectedLevel);
  }

  if (gameState === "win" && key === ' ') {
    gameState = "start";
  }
}

function drawTitleScreen() {
  fill(230);
  textSize(52);
  text("INFESTATION", width / 2, 150);

  textSize(20);
  fill(190);
  text("Destroy the spores.", width / 2, 215);
  text("Survive.", width / 2, 245);

  drawButton("Begin", width / 2, 340, 220, 60);

  textSize(16);
  fill(160);
  text("Press SPACE or click Begin", width / 2, 405);
}

function drawLevelSelectScreen() {
  fill(230);
  textSize(42);
  text("INFESTATION", width / 2, 60);

  drawInfoCard(width / 2, 170);

  drawLevelButton(1, width / 2, 330);
  drawLevelButton(2, width / 2, 405);
  drawLevelButton(3, width / 2, 480);
}

function drawInfoCard(x, y) {
  rectMode(CENTER);
  stroke(120);
  strokeWeight(2);
  fill(35);
  rect(x, y, 620, 165, 12);

  noStroke();
  fill(230);
  textSize(20);
  text("Controls + Tips", x, y - 58);

  fill(190);
  textSize(15);
  text("Click spores to damage them. The number shows how many hits they need.", x, y - 25);
  text("Do not stop clicking for too long, or idle growth will speed up the spread.", x, y);
  text("Survive until the timer reaches zero to unlock the next infestation.", x, y + 25);
  text("SPACE: begin / retry   |   R: return to level select   |   Click buttons to select", x, y + 55);

  rectMode(CORNER);
}

function drawLevelButton(levelNumber, x, y) {
  let unlocked = levelNumber <= highestUnlockedLevel;

  rectMode(CENTER);
  stroke(255);
  strokeWeight(2);

  if (unlocked) {
    fill(50, 90, 55);
  } else {
    fill(45);
  }

  rect(x, y, 280, 55, 10);

  noStroke();
  fill(unlocked ? 255 : 130);
  textSize(20);

  if (unlocked) {
    text(levels[levelNumber].name, x, y);
  } else {
    text("Infestation " + levelNumber + ": Locked", x, y);
  }

  rectMode(CORNER);
}

function startGame(levelNumber) {
  selectedLevel = levelNumber;
  spores = [];
  pendingSpores = [];
  startTime = millis();
  lastClickTime = millis();
  gameState = "playing";

  scheduleRandomOutbreak();
}

function playGame() {
  let level = levels[selectedLevel];

  let elapsed = (millis() - startTime) / 1000;
  let timeLeft = max(0, level.surviveTime - elapsed);

  addPendingSpores();

  for (let spore of spores) {
    spore.update();
    spore.display();
  }

  let idleMultiplier = getIdleMultiplier();

  if (spores.length === 0 && pendingSpores.length === 0 && timeLeft > 0) {
    scheduleRandomOutbreak();
  }

  if (
    spores.length >= 1 &&
    spores.length <= 3 &&
    pendingSpores.length === 0 &&
    random(1) < level.lowSporeClusterChance * idleMultiplier
  ) {
    scheduleSmallOutbreakNearExistingSpore();
  }

  let spreadChance = level.baseSpreadRate * pow(level.spreadGrowth, spores.length / 12);
  spreadChance *= idleMultiplier;
  spreadChance = constrain(spreadChance, 0, level.maxSpreadCap);

  if (spores.length > level.panicLimit) {
    spreadChance *= 0.45;
  } else if (spores.length > level.panicLimit * 0.75) {
    spreadChance *= 0.7;
  }

  let sporesCreatedThisFrame = 0;
  let maxNewSporesPerFrame = 1;

  if (timeLeft < level.surviveTime * 0.3 && spores.length < level.panicLimit) {
    maxNewSporesPerFrame = 2;
  }

  for (let spore of spores) {
    if (spores.length + pendingSpores.length >= level.maxSpores) break;
    if (sporesCreatedThisFrame >= maxNewSporesPerFrame) break;

    let individualSpreadChance = spreadChance * spore.getSpreadMultiplier();

    if (random(1) < individualSpreadChance) {
      spore.scheduleSpread();
      sporesCreatedThisFrame++;
    }
  }

  if (timeLeft <= 0) {
    unlockNextLevel();
    gameState = "win";
  }

  if (spores.length >= level.maxSpores) {
    gameState = "lose";
  }

  drawHUD(timeLeft, idleMultiplier);
}

function getIdleMultiplier() {
  let idleTime = millis() - lastClickTime;

  if (idleTime < idleDelay) {
    return 1;
  }

  let idleSeconds = (idleTime - idleDelay) / 1000;
  let multiplier = pow(idleGrowthRate, idleSeconds);

  return constrain(multiplier, 1, maxIdleMultiplier);
}

function unlockNextLevel() {
  if (selectedLevel === highestUnlockedLevel && highestUnlockedLevel < 3) {
    highestUnlockedLevel++;
  }
}

function addPendingSpores() {
  for (let i = pendingSpores.length - 1; i >= 0; i--) {
    if (millis() >= pendingSpores[i].birthTime) {
      spores.push(
        new Spore(
          pendingSpores[i].x,
          pendingSpores[i].y,
          pendingSpores[i].forcedHealth
        )
      );
      pendingSpores.splice(i, 1);
    }
  }
}

function scheduleSmallOutbreakNearExistingSpore() {
  if (spores.length === 0) return;

  let parent = random(spores);
  let clusterX = parent.x + random(-140, 140);
  let clusterY = parent.y + random(-140, 140);

  clusterX = constrain(clusterX, 80, width - 80);
  clusterY = constrain(clusterY, 80, height - 80);

  let amount = floor(random(2, 4));
  let spreadAmount = random(35, 70);

  for (let i = 0; i < amount; i++) {
    scheduleSpore(
      clusterX + random(-spreadAmount, spreadAmount),
      clusterY + random(-spreadAmount, spreadAmount),
      i * random(300, 650),
      randomStartingHealth()
    );
  }
}

function scheduleRandomOutbreak() {
  let outbreakType = floor(random(4));

  if (outbreakType === 0) {
    scheduleSporeCluster(floor(random(3, 5)), 50, 300);
  } else if (outbreakType === 1) {
    scheduleSporeCluster(floor(random(4, 6)), 95, 400);
  } else if (outbreakType === 2) {
    scheduleMultipleClusters(floor(random(2, 3)));
  } else {
    scheduleScatteredSpores(floor(random(4, 7)));
  }
}

function scheduleSporeCluster(amount, spreadAmount, delayBetweenSpores) {
  let clusterX = random(100, width - 100);
  let clusterY = random(100, height - 100);

  for (let i = 0; i < amount; i++) {
    scheduleSpore(
      clusterX + random(-spreadAmount, spreadAmount),
      clusterY + random(-spreadAmount, spreadAmount),
      i * delayBetweenSpores,
      randomStartingHealth()
    );
  }
}

function scheduleMultipleClusters(clusterAmount) {
  for (let c = 0; c < clusterAmount; c++) {
    let amount = floor(random(2, 4));
    let spreadAmount = random(40, 85);

    scheduleSporeCluster(amount, spreadAmount, 350 + c * 160);
  }
}

function scheduleScatteredSpores(amount) {
  for (let i = 0; i < amount; i++) {
    scheduleSpore(
      random(50, width - 50),
      random(50, height - 50),
      i * random(300, 550),
      randomStartingHealth()
    );
  }
}

function scheduleSpore(x, y, delay, forcedHealth) {
  let level = levels[selectedLevel];

  if (spores.length + pendingSpores.length >= level.maxSpores) return;

  pendingSpores.push({
    x: constrain(x, 25, width - 25),
    y: constrain(y, 25, height - 25),
    birthTime: millis() + delay,
    forcedHealth: forcedHealth
  });
}

function randomStartingHealth() {
  let roll = random(1);

  if (selectedLevel === 1) {
    if (roll < 0.58) return 3;
    if (roll < 0.9) return 4;
    return 5;
  }

  if (selectedLevel === 2) {
    if (roll < 0.5) return 3;
    if (roll < 0.84) return 4;
    return 5;
  }

  if (selectedLevel === 3) {
    if (roll < 0.60) return 3;
    if (roll < 0.88) return 4;
    if (roll < 0.98) return 5;
    return 6;
  }

  return 3;
}

function drawHUD(timeLeft, idleMultiplier) {
  let level = levels[selectedLevel];

  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text(level.name, 20, 20);
  text("Time Left: " + ceil(timeLeft), 20, 50);
  text("Spores: " + spores.length + " / " + level.maxSpores, 20, 80);

  if (idleMultiplier > 1) {
    fill(255, 120, 120);
    text("Idle growth", 20, 110);
  }

  fill(180);
  textSize(14);
  text("Press R to return to level select", 20, height - 35);

  textAlign(CENTER, CENTER);
}

function drawButton(label, x, y, w, h) {
  rectMode(CENTER);
  stroke(255);
  strokeWeight(2);
  fill(50, 90, 55);
  rect(x, y, w, h, 10);

  noStroke();
  fill(255);
  textSize(20);
  text(label, x, y);

  rectMode(CORNER);
}

function buttonClicked(x, y, w, h) {
  return (
    mouseX > x - w / 2 &&
    mouseX < x + w / 2 &&
    mouseY > y - h / 2 &&
    mouseY < y + h / 2
  );
}

function drawWinScreen() {
  fill(230);
  textSize(46);
  text("INFESTATION CLEARED", width / 2, height / 2 - 120);

  textSize(22);
  text(levels[selectedLevel].name, width / 2, height / 2 - 70);

  textSize(18);

  if (selectedLevel < 3) {
    text("Infestation " + (selectedLevel + 1) + " unlocked.", width / 2, height / 2 - 25);
  } else {
    text("You survived every infestation.", width / 2, height / 2 - 25);
  }

  drawButton("Return to Level Select", width / 2, height / 2 + 45, 280, 55);

  textSize(16);
  fill(180);
  text("Press SPACE or R to return", width / 2, height / 2 + 95);
}

function drawLoseScreen() {
  fill(230);
  textSize(48);
  text("OVERRUN", width / 2, height / 2 - 120);

  textSize(20);
  text("It consumed everything.", width / 2, height / 2 - 70);

  drawButton("Try Again", width / 2, height / 2 + 10, 220, 55);
  drawButton("Return to Level Select", width / 2, height / 2 + 85, 280, 55);

  textSize(16);
  fill(180);
  text("Press SPACE to try again", width / 2, height / 2 + 135);
  text("Press R to return to level select", width / 2, height / 2 + 160);
}

function mousePressed() {
  if (gameState === "title") {
    if (buttonClicked(width / 2, 340, 220, 60)) {
      gameState = "start";
    }
    return;
  }

  if (gameState === "start") {
    checkLevelSelectClick();
    return;
  }

  if (gameState === "win") {
    if (buttonClicked(width / 2, height / 2 + 45, 280, 55)) {
      gameState = "start";
    }
    return;
  }

  if (gameState === "lose") {
    if (buttonClicked(width / 2, height / 2 + 10, 220, 55)) {
      startGame(selectedLevel);
    }

    if (buttonClicked(width / 2, height / 2 + 85, 280, 55)) {
      gameState = "start";
    }

    return;
  }

  if (gameState === "playing") {
    lastClickTime = millis();

    for (let i = spores.length - 1; i >= 0; i--) {
      if (spores[i].clicked(mouseX, mouseY)) {
        spores[i].health--;

        if (spores[i].health <= 0) {
          spores.splice(i, 1);
        }

        break;
      }
    }
  }
}

function checkLevelSelectClick() {
  for (let levelNumber = 1; levelNumber <= 3; levelNumber++) {
    let buttonX = width / 2;
    let buttonY = 255 + levelNumber * 75;

    if (
      mouseX > buttonX - 140 &&
      mouseX < buttonX + 140 &&
      mouseY > buttonY - 27.5 &&
      mouseY < buttonY + 27.5
    ) {
      if (levelNumber <= highestUnlockedLevel) {
        startGame(levelNumber);
      }
    }
  }
}

class Spore {
  constructor(x, y, forcedHealth) {
    this.x = constrain(x, 25, width - 25);
    this.y = constrain(y, 25, height - 25);

    this.health = forcedHealth || randomStartingHealth();
    this.maxHealth = this.health;

    if (this.health <= 3) {
      this.size = random(28, 42);
      this.bodyColor = color(90, 200, 100);
      this.centerColor = color(40, 100, 50);
    } else if (this.health === 4) {
      this.size = random(38, 52);
      this.bodyColor = color(170, 210, 90);
      this.centerColor = color(90, 120, 40);
    } else if (this.health === 5) {
      this.size = random(48, 62);
      this.bodyColor = color(210, 160, 80);
      this.centerColor = color(120, 70, 30);
    } else {
      this.size = random(55, 70);
      this.bodyColor = color(210, 90, 90);
      this.centerColor = color(120, 40, 40);
    }

    this.pulse = random(TWO_PI);
  }

  update() {
    this.pulse += 0.05;
  }

  display() {
    let pulseSize = sin(this.pulse) * 3;

    noStroke();

    fill(80, 160, 90, 70);
    ellipse(this.x, this.y, this.size + 18 + pulseSize);

    fill(this.bodyColor);
    ellipse(this.x, this.y, this.size + pulseSize);

    fill(this.centerColor);
    ellipse(this.x, this.y, this.size * 0.45);

    fill(255);
    textSize(14);
    text(this.health, this.x, this.y);
  }

  clicked(px, py) {
    return dist(px, py, this.x, this.y) < this.size / 2;
  }

  getSpreadMultiplier() {
    if (this.maxHealth <= 3) {
      return 1.0;
    } else if (this.maxHealth === 4) {
      return 1.15;
    } else if (this.maxHealth === 5) {
      return 1.35;
    } else {
      return 1.6;
    }
  }

  scheduleSpread() {
    let level = levels[selectedLevel];

    if (spores.length + pendingSpores.length >= level.maxSpores) return;

    let angle = random(TWO_PI);
    let distance;

    if (random(1) < 0.8) {
      distance = random(40, 100);
    } else {
      distance = random(120, 190);
    }

    let newX = this.x + cos(angle) * distance;
    let newY = this.y + sin(angle) * distance;

    scheduleSpore(newX, newY, random(350, 950), randomStartingHealth());
  }
}
