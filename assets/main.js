let Application = PIXI.Application,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    Graphics = PIXI.Graphics,
    Container = PIXI.Container ;


let type = "WebGL";

if (!PIXI.utils.isWebGLSupported()) {
    type = "canvas";
}

PIXI.utils.sayHello(type);

let app = initializeApp();

function initializeApp() {
    let app = new Application({width: 1000, height: 562.50});
    app.renderer.autoResize =  true;

    app.renderer.backgroundColor = 0x2d6796;

    document.body.appendChild(app.view);
    return app;   
}

screenWidth = app.renderer.view.width;
screenHeight = app.renderer.view.height;

let underLayer = new PIXI.Container();
app.stage.addChild(underLayer);

let overLayer = new PIXI.Container();
app.stage.addChild(overLayer);

let deadSebasImagePath = "./assets//sprites/sebas-ded.png",
    fallingSebasImagePath = "./assets/sprites/sebas-fallin.png",
    pressedSebasImagePath = "./assets/sprites/sebas-press.png",
    regularSebasImagePath = "./assets/sprites/sebas-regular.png";
// Adds images to loader to convert them to textures.
loader
    .add([
        deadSebasImagePath,
        fallingSebasImagePath,
        pressedSebasImagePath,
        regularSebasImagePath
    ])
    .load(setup);

let sebas;

class Tube {
    constructor(gap) {
        
        this.top = new Graphics();
        this.bottom = new Graphics();
        
        // Add color to the rectangles.
        this.top.beginFill(0x0b375b);
        this.bottom.beginFill(0x0b375b);

        this.gap = gap;

        let thickness = 125;
        let topHeight = this.getRandomHeight();

        
        

        // The rectangles appear on the edge of the screen.
        // They are invisible until moved.
        this.top.drawRect(0, 0, thickness, topHeight);
        this.bottom.drawRect(0, topHeight + gap, thickness, screenHeight - (topHeight + gap));
        
        // End drawing.
        this.top.endFill();
        this.bottom.endFill();

        // app.stage.addChild(this.top);
        // app.stage.addChild(this.bottom);

        underLayer.addChild(this.top);
        underLayer.addChild(this.bottom);

        // Each tube is a node in a double linked list
        this.next = undefined;
        this.prev =  undefined;


        // For some reason the x parameter must be set to 0
        // in drawRect.
        this.top.x = 1000;
        this.bottom.x = 1000;
    }

    move(speed) {
        this.top.x -= speed;
        this.bottom.x -= speed;
    }

    removeSprites() {
        // app.stage.removeChild(this.top);
        // app.stage.removeChild(this.bottom);
        underLayer.removeChild(this.top);
        underLayer.removeChild(this.bottom);
    }

    getRandomHeight() {
        let min = 50;
        let max = screenHeight - (this.gap + 50);

        let height = Math.floor(Math.random() * (max - min + 1)) + min;
        return height;
    }

    colliding(sprite) {
        // The method getBounds is needed to get the coordinates
        // from the sprites. For some reason, when accessing properties
        // directly the values returned are off.
        let top_tube_bounds = this.top.getBounds();
        let bottom_tube_bounds = this.bottom.getBounds();
        let sprite_bounds =  sprite.getBounds();

        let tube_x1 = top_tube_bounds.x;
        let tube_x2 = tube_x1 + top_tube_bounds.width;
        let sprite_x1 = sprite_bounds.x;
        let sprite_x2 = sprite_x1 + sprite_bounds.width;
        let horizontalCollision = (sprite_x1 <= tube_x1 && sprite_x2 >= tube_x1) || (sprite_x1 >= tube_x1 && sprite_x2 <= tube_x2) || (sprite_x1 <= tube_x2 && sprite_x2 >= tube_x2);

        let top_tube_height = top_tube_bounds.y + top_tube_bounds.height;
        let bottom_tube_height = bottom_tube_bounds.y;
        // let bottom_tube_height =  top_tube_height + this.gap;
        let verticalCollision = sprite_bounds.y <= top_tube_height || sprite_bounds.y + sprite.height >= bottom_tube_height;    

        return horizontalCollision && verticalCollision;
    }

    spritePassesTube(sprite, speed) {
        let sprite_bounds = sprite.getBounds();
        let tube_bounds = this.top.getBounds();

        // let passes = sprite_bounds.left === tube_bounds.right;

        // The speed is needed to calculate the range. Otherwise it wont count as a pass.
        let passes = sprite_bounds.left >= tube_bounds.right && sprite_bounds.left  <= tube_bounds.right + speed;
        // let passes =  sprite_bounds.left === tube_bounds.right || sprite_bounds.left === tube_bounds.right + 2;

        return passes;
    }

}

class Tubes {
    // This is a double-linked list representing the tubes.
    constructor() {
        this.first = undefined;
        this.last = undefined;
    }

    isEmpty() {
        return this.first === undefined && this.last === undefined;
    }

    addTube() {
        let newTube = new Tube(250);
        if (!this.isEmpty()) {
            this.last.prev = newTube;
            newTube.next = this.last;
        } else {
            this.first = newTube;
        }
        this.last = newTube;
    }

    removeTube() {
        this.first = this.first.prev;
    }


    moveAllTubes(speed) {
        if (!this.isEmpty()) {
            
            let currentTube = this.first;
            while (currentTube !== undefined) {
                currentTube.move(speed);
                currentTube = currentTube.prev;
            }
        }
    }

    needToAddMore() {
        if (!this.isEmpty()) {
            let distanceBetweenTubes = 300;
            return this.last.top.x < screenWidth - distanceBetweenTubes;
        }
        return true;
    }

    needToRemove() {
        if (!this.isEmpty()) {
            return this.first.x + this.first.width < 0;
        }
        return false;
    }

    checkCollision(sprite) {
        let colliding = false;
        let currentTube = this.first;
        
        while (currentTube !== undefined) {
            if (currentTube.colliding(sprite)) {
                colliding = true;
            }
            currentTube =  currentTube.prev;
        }

        // If not collisions has been detected, this method will
        // return true, else it will return false.  q   `
        return colliding;
    }

    spritePassedSomeTube(sprite, speed) {

        let passing = false;
        let currentTube = this.first;

        while(currentTube !== undefined && passing === false) {
            passing = currentTube.spritePassesTube(sprite, speed);
            currentTube = currentTube.prev;
        }

        return passing;
    }
    

}

let tubes = new Tubes();
let score;
let speed;

let scoreDisplay;

function setup() {
    let deadSebas = new Sprite(
        resources[deadSebasImagePath].texture
    );
    sebas = new Sprite(
        resources[regularSebasImagePath].texture
    );

    // Game's current state.
    state = play;

    sebas.width = 75;
    sebas.height = 75;

    sebas.anchor.set(0.5, 0.5);

    sebas.vx = 0; // The rest of the game moves.
    sebas.vy = 5;
    sebas.x = 150;
    sebas.y = app.renderer.view.height / 2;

    sebas.jumpTo = undefined;

    // app.stage.addChild(sebas);
    underLayer.addChild(sebas);
    app.ticker.add(delta => gameLoop(delta));

    // Sets controlls
    let spacebar = keyboard(32);
      
    spacebar.press = () =>  {
        if (sebas.jumpTo === undefined) {
            sebas.jumpTo = sebas.y - (sebas.vy * 17);
        }
    };
    spacebar.release = () => {
        // Nothings happens when the spacebar is released.
    }

    score = 0;
    speed = 2;

    scoreDisplay = new Text(score.toString(), {fill: "white"});
    // app.stage.addChild(scoreDisplay);
    overLayer.addChild(scoreDisplay);
    scoreDisplay.position.set(950, 5);
}
function gameLoop(delta) {
    state(delta);
}

function endgame(delta) {

}

function play(delta) {
    // This handles sabes jump states.
    if (sebas.jumpTo < sebas.y && sebas.y - (sebas.height / 2) > 0) { 
        // sebas.rotation = -0.3;
        sebas.y -= sebas.vy;
    } else if(sebas.y + (sebas.height / 2) > app.renderer.view.height) {
        state = endgame;
    } else {
        sebas.rotation = 0;
        sebas.y += sebas.vy;
        sebas.jumpTo = undefined;
    }

    // If any tubes are missing, add more more tubes.
    if (tubes.needToAddMore()) {
        tubes.addTube();
    }

    tubes.moveAllTubes(2);

    if (tubes.checkCollision(sebas)) {
        state = endgame;
    }

    if (tubes.needToRemove()) {
        tubes.removeTube();
    }

    if (tubes.spritePassedSomeTube(sebas, speed)) {
        score++;
        updateScoreDisplay(score);
        console.log(score);
    }

}

function updateScoreDisplay(score) {
    scoreDisplay.text = score.toString();
}


// Don't touch this function.
function keyboard(keyCode) {
    let key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;

    // The down handler.
    key.downHandler =  event => {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) {
                key.press();
            }
            key.isDown = true;
            key.isUp = false;
        }
        event.preventDefault();
    };

    // The up handler
    key.upHandler = event => {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) {
                key.release();
            }
            key.isDown = false;
            key.isUp = true;
        }
        event.preventDefault();
    };

    // Attach event listeners
    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    );
    return key;
}

function getSpriteRange(sprite) {
    let horizontalRange = sprite.x + sprite.width;
    let verticalRange =  sprite.y + sprite.height;
}