var initials = 'SML';
var choice = '1';
var lastscreenshot = 61;

var eyeSize = 250;
var teethSize = 160;
var lineThickness = 20;
var bowSize = 160;

// images
var bgImg;
var stamp1, stamp2, stamp3, stamp4, stamp5, stamp6, stamp7, stamp8, stamp0;

// drawing layers
var drawingLayer;
var previewLayer;

// straight line tool variables
var lineStartX = null;
var lineStartY = null;
var lineStartColor = null;

// undo / redo
var undoStack = [];
var redoStack = [];
var maxUndo = 20;

// toolbar
var toolButtons = [];
var toolbarDiv;
var canvasElement;

function preload() {
  bgImg = loadImage('Daughter_.png');

  stamp1 = loadImage('eyes_1.png');
  stamp2 = loadImage('eyes_2.png');
  stamp3 = loadImage('eyes_3.png');
  stamp4 = loadImage('eyes_4.png');
  stamp5 = loadImage('teeth_1.png');
  stamp6 = loadImage('teeth_2.png');
  stamp7 = loadImage('teeth_3.png');
  stamp8 = loadImage('teeth_4.png');
  stamp0 = loadImage('bow.gif');
}

function setup() {
  pixelDensity(1);

  document.body.style.backgroundColor = "#2b2b2b";

  // LEFT SIDEBAR TOOLBAR
  toolbarDiv = createDiv();
  toolbarDiv.position(10, 10);
  toolbarDiv.style('width', '140px');

  // CANVAS SHIFTED RIGHT
  canvasElement = createCanvas(700, 700);
  canvasElement.position(170, 40);

  drawingLayer = createGraphics(700, 700);
  previewLayer = createGraphics(700, 700);

  drawingLayer.pixelDensity(1);
  previewLayer.pixelDensity(1);

  drawingLayer.clear();
  previewLayer.clear();

  imageMode(CENTER);
  drawingLayer.imageMode(CORNER);
  previewLayer.imageMode(CORNER);

  createToolbar();
}

function createToolbar() {
  var labels = [
    { key: '1', text: 'Eyes 1' },
    { key: '2', text: 'Eyes 2' },
    { key: '3', text: 'Eyes 3' },
    { key: '4', text: 'Eyes 4' },
    { key: '5', text: 'Teeth 1' },
    { key: '6', text: 'Teeth 2' },
    { key: '7', text: 'Teeth 3' },
    { key: '8', text: 'Teeth 4' },
    { key: '9', text: 'Hair' },
    { key: '0', text: '...' }
  ];

  var buttonW = 120;
  var buttonH = 28;
  var gap = 6;

  for (var i = 0; i < labels.length; i++) {
    var btn = createButton(labels[i].text);
    btn.parent(toolbarDiv);
    btn.size(buttonW, buttonH);
    btn.style('display', 'block');
    btn.style('margin-bottom', gap + 'px');
    btn.mousePressed(makeToolSetter(labels[i].key));
    toolButtons.push(btn);
  }

  createButton('Undo').parent(toolbarDiv).size(buttonW, buttonH).style('display','block').style('margin-bottom',gap+'px').mousePressed(undoAction);
  createButton('Redo').parent(toolbarDiv).size(buttonW, buttonH).style('display','block').style('margin-bottom',gap+'px').mousePressed(redoAction);
  createButton('Brush Size Up').parent(toolbarDiv).size(buttonW, buttonH).style('display','block').style('margin-bottom',gap+'px').mousePressed(increaseSize);
  createButton('Brush Size Down').parent(toolbarDiv).size(buttonW, buttonH).style('display','block').style('margin-bottom',gap+'px').mousePressed(decreaseSize);
  createButton('Clear').parent(toolbarDiv).size(buttonW, buttonH).style('display','block').style('margin-bottom',gap+'px').mousePressed(clearCanvas);
  createButton('Save').parent(toolbarDiv).size(buttonW, buttonH).style('display','block').mousePressed(saveme);
}

function makeToolSetter(toolKey) {
  return function() {
    choice = toolKey;
  };
}

function draw() {
  background(0);

  imageMode(CORNER);
  image(bgImg, 0, 0, width, height);

  image(drawingLayer, 0, 0);

  previewLayer.clear();

  if (choice == '9' && lineStartX !== null) {
    drawSpike(previewLayer, lineStartX, lineStartY, mouseX, mouseY, lineThickness, lineStartColor);
  }

  image(previewLayer, 0, 0);
}

function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    return;
  }

  if (choice == '0' || (choice >= '1' && choice <= '8')) {
    placeStamp(choice, mouseX, mouseY);
  } else if (choice == '9') {
    if (lineStartX === null) {
      lineStartX = mouseX;
      lineStartY = mouseY;
      lineStartColor = get(mouseX, mouseY);
    } else {
      saveState();
      drawSpike(drawingLayer, lineStartX, lineStartY, mouseX, mouseY, lineThickness, lineStartColor);
      lineStartX = null;
      lineStartY = null;
      lineStartColor = null;
    }
  }
}

function drawSpike(layer, x1, y1, x2, y2, thickness, spikeColor) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var len = sqrt(dx * dx + dy * dy);

  if (len < 1) return;

  var nx = -dy / len;
  var ny = dx / len;
  var halfW = thickness * 0.2;

  layer.noStroke();
  layer.fill(spikeColor);
  layer.triangle(
    x1 + nx * halfW, y1 + ny * halfW,
    x1 - nx * halfW, y1 - ny * halfW,
    x2, y2
  );
}

function placeStamp(toolChoice, x, y) {
  var currentStamp;
  var currentSize;

  if (toolChoice == '0') { currentStamp = stamp0; currentSize = bowSize; }
  else if (toolChoice == '1') { currentStamp = stamp1; currentSize = eyeSize; }
  else if (toolChoice == '2') { currentStamp = stamp2; currentSize = eyeSize; }
  else if (toolChoice == '3') { currentStamp = stamp3; currentSize = eyeSize; }
  else if (toolChoice == '4') { currentStamp = stamp4; currentSize = eyeSize; }
  else if (toolChoice == '5') { currentStamp = stamp5; currentSize = teethSize; }
  else if (toolChoice == '6') { currentStamp = stamp6; currentSize = teethSize; }
  else if (toolChoice == '7') { currentStamp = stamp7; currentSize = teethSize; }
  else if (toolChoice == '8') { currentStamp = stamp8; currentSize = teethSize; }

  if (currentStamp) {
    saveState();
    drawingLayer.image(currentStamp, x - currentSize/2, y - currentSize/2, currentSize, currentSize);
  }
}

function saveState() {
  undoStack.push(drawingLayer.get());
  if (undoStack.length > maxUndo) undoStack.shift();
  redoStack = [];
}

function undoAction() {
  if (undoStack.length > 0) {
    redoStack.push(drawingLayer.get());
    var prev = undoStack.pop();
    drawingLayer.clear();
    drawingLayer.copy(prev,0,0,prev.width,prev.height,0,0,drawingLayer.width,drawingLayer.height);
  }
}

function redoAction() {
  if (redoStack.length > 0) {
    undoStack.push(drawingLayer.get());
    var next = redoStack.pop();
    drawingLayer.clear();
    drawingLayer.copy(next,0,0,next.width,next.height,0,0,drawingLayer.width,drawingLayer.height);
  }
}

function increaseSize() {
  if (choice=='0') bowSize+=20;
  else if (choice>='1'&&choice<='4') eyeSize+=20;
  else if (choice>='5'&&choice<='8') teethSize+=20;
  else if (choice=='9') lineThickness+=2;
}

function decreaseSize() {
  if (choice=='0') bowSize-=20;
  else if (choice>='1'&&choice<='4') eyeSize-=20;
  else if (choice>='5'&&choice<='8') teethSize-=20;
  else if (choice=='9') lineThickness-=2;

  if (bowSize<5) bowSize=5;
  if (eyeSize<5) eyeSize=5;
  if (teethSize<5) teethSize=5;
  if (lineThickness<1) lineThickness=1;
}

function clearCanvas() {
  saveState();
  drawingLayer.clear();
  previewLayer.clear();
  lineStartX=null;
  lineStartY=null;
  lineStartColor=null;
}

function keyPressed() {
  if (key>='0'&&key<='9') choice=key;
  if (key=='z'||key=='Z') undoAction();
  if (key=='y'||key=='Y') redoAction();
  if (key=='x'||key=='X') clearCanvas();
  if (key=='p'||key=='P') saveme();
  if (keyCode===UP_ARROW) increaseSize();
  if (keyCode===DOWN_ARROW) decreaseSize();
}

function saveme() {
  var filename = initials + day() + hour() + minute() + second();
  if (second()!=lastscreenshot) saveCanvas(filename,'jpg');
  lastscreenshot = second();
}
