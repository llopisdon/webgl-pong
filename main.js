import { mat4 } from "./node_modules/gl-matrix/esm/index.js";

// NES dimensions for fun
const GAME_WIDTH = 256;
const GAME_HEIGHT = 240;

console.log(">>> init main.js <<<");

// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage
/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#canvas");
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
/** @type {WebGLRenderingContext} */
const gl = canvas.getContext("webgl");


/** @type {HTMLCanvasElement} */
const textCanvas = document.querySelector("#text");
textCanvas.width = GAME_WIDTH;
textCanvas.height = GAME_HEIGHT;
/** @type {CanvasRenderingContext2D} */
const ctx = textCanvas.getContext("2d");
ctx.font = '24px"Pixel NES"';
ctx.fillStyle = "white";


if (!gl) {
    throw "Unable to init WebGL!";
} else {
    console.log("WebGL init...")
}

const TEXT_START = 4;
const TEXT_TOP = 20;
const TEXT_HEIGHT = 20;
const TEXT_CENTER_X = GAME_WIDTH / 2;
const TEXT_CENTER_Y = GAME_HEIGHT / 2;


let dt = 0;
let last = 0;

let shaders = [];
let buffers = {};

const normalizedModelViewProjection = mat4.create();
console.log(normalizedModelViewProjection);
const modelViewProjection = mat4.create();
const modelScale = mat4.create();
const modelTranslate = mat4.create();

//
// Keyboard
//

// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values

const KEY_ARROW_UP = "ArrowUp";
const KEY_ARROW_DOWN = "ArrowDown";
const KEY_ARROW_LEFT = "ArrowLeft";
const KEY_ARROW_RIGHT = "ArrowRight";
const KEY_CONTROL = "Control";
const KEY_SPACE = " ";

const KEY_W = "KeyW";
const KEY_A = "KeyA";
const KEY_S = "KeyS";
const KEY_D = "KeyD";

const KEY_I = "KeyI";
const KEY_J = "KeyJ";
const KEY_K = "KeyK";
const KEY_L = "KeyL";

const GAME_KEYS = [
    KEY_ARROW_LEFT,
    KEY_ARROW_RIGHT,
    KEY_ARROW_UP,
    KEY_ARROW_DOWN,

    KEY_W, KEY_A, KEY_S, KEY_D,

    KEY_I, KEY_J, KEY_K, KEY_L
];

let keys = {};

document.addEventListener("keydown", e => {
    console.log(`keydown -> key: ${e.key} code: ${e.code}`);
    if ( GAME_KEYS.indexOf(e.key) >= 0) {
        e.preventDefault();
    }
    keys[e.code] = true;
});

document.addEventListener("keyup", e => {
    console.log(`keyup -> key: ${e.key} code: ${e.code}`);
    keys[e.code] = false;
});

// TODO add responsive canvas

// game text
let START_TEXT_WIDTH = 0;
let TITLE_TEXT_WIDTH = 0;
const START_TEXT = "START";
const TITLE_TEXT = "WEBGL-PONG";


function setup() {

    //
    // text init
    //

    START_TEXT_WIDTH = ctx.measureText(START_TEXT).width / 2;
    TITLE_TEXT_WIDTH = ctx.measureText(TITLE_TEXT).width / 2;

    //
    // webgl init
    //
    
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);

    let w = gl.canvas.clientWidth / 2.0;
    let h = gl.canvas.clientHeight / 2.0;

    mat4.ortho(
        modelViewProjection,
        -w, w,
        -h, h,
        -1.0,
        1.0
    );

    console.log(modelViewProjection);

    {
        const vsSource = `
        attribute vec4 a_coords;
        attribute vec4 a_color;
        uniform mat4 u_modelviewProjection;
        uniform mat4 u_Scale;
        uniform mat4 u_Translate;
        uniform vec4 u_color;
        varying lowp vec4 v_color;
        void main() {
            gl_Position = u_modelviewProjection * u_Translate * u_Scale * a_coords;
            v_color = u_color;
        }
        `;
    
        const fsSource = `
        varying lowp vec4 v_color;
        void main() {
            gl_FragColor = v_color;
        }
        `;
    
        let program = initShaderProgram(gl, vsSource, fsSource);

        shaders['program1'] = {
            'program': program,
            'attribs': {
                'a_coords': gl.getAttribLocation(program, 'a_coords'),
            },
            'uniforms': {
                'u_modelviewProjection': gl.getUniformLocation(program, 'u_modelviewProjection'),
                'u_Scale': gl.getUniformLocation(program, 'u_Scale'),
                'u_Translate': gl.getUniformLocation(program, 'u_Translate'),
                'u_color': gl.getUniformLocation(program, 'u_color')
            }
        };
    }

    // 2x2 rectangle
    {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]),
            gl.STATIC_DRAW);
        
        buffers['2x2_rect'] = {
            'buffer': buffer,
            'size': 2,
            'count': 4
        }
    }

    // unit triangle
    {
        const R = 1;
        const PI_OVER_180 = Math.PI / 180;
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([
                R * Math.cos(Math.PI/2), R * Math.sin(Math.PI/2),
                R * Math.cos(210 * PI_OVER_180), R * Math.sin(210 * PI_OVER_180), 
                R * Math.cos(330 * PI_OVER_180), R * Math.sin(330 * PI_OVER_180), 
            ]),
            gl.STATIC_DRAW);
        buffers['unit_triangle'] = {
            'buffer': buffer,
            'size': 2,
            'count': 3
        }
    }

    // unit square
    {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(
                [
                  0.5, 0.5,
                  -0.5, 0.5,
                  0.5, -0.5,
                  -0.5, -0.5
                ]
            ),
            gl.STATIC_DRAW);
        buffers['unit_square'] = {
            'buffer': buffer,
            'size': 2,
            'count': 4
        }
    }

    reset();

    requestAnimationFrame(update);
}

function reset() {
    keys[KEY_ARROW_LEFT] = false;
    keys[KEY_ARROW_RIGHT] = false;
    keys[KEY_ARROW_UP] = false;
    keys[KEY_ARROW_DOWN] = false;
    keys[KEY_CONTROL] = false;
    keys[KEY_SPACE] = false;

    paddle0XPos = 0.0 - gl.canvas.clientWidth / 2.0 + 20;
    paddle0YPos = 0.0;
    paddle0PrevXPos = paddle0XPos;
    paddle0PrevYPos = paddle0YPos;

    paddle1XPos = 0.0 + gl.canvas.clientWidth / 2.0 - 20;
    paddle1YPos = 0.0;
    paddle1PrevXPos = paddle1XPos;
    paddle1PrevYPos = paddle1YPos;

    MAX_PADDLE_Y = 0 + gl.canvas.clientHeight / 2.0 - (PADDLE_HEIGHT / 2.0);
    MAX_BALL_X = 0 + gl.canvas.clientWidth / 2.0 - (BALL_RADIUS / 2.0);
    MAX_BALL_Y = 0 + gl.canvas.clientHeight / 2.0 - (BALL_RADIUS / 2.0);
}


const PADDLE_SPEED = 120.0;
const PADDLE_WIDTH = 10.0;
const PADDLE_HEIGHT = 60.0;
const BALL_RADIUS = PADDLE_WIDTH;

let MAX_PADDLE_Y = 0;
let MAX_BALL_X = 0;
let MAX_BALL_Y = 0;

let paddle0XPos = 0;
let paddle0YPos = 0;
let paddle0PrevXPos = 0;
let paddle0PrevYPos = 0;
let paddle0Dir = 0;

let paddle1XPos = 0;
let paddle1YPos = 0;
let paddle1PrevXPos = 0;
let paddle1PrevYPos = 0;
let paddle1Dir = 0;

let ballXPos = 0.0;
let ballYPos = 0.0;
let ballPrevXPos = 0;
let ballPrevYPos = 0;
let ballXDir = 1.0;
let ballYDir = -1.0;

let pulseAngle = 0.0;
const PI_OVER_2 = Math.PI / 2;
const DEG_30 = 30 * (Math.PI / 180);
let pulseDir = 1.0;


const BLINK_RATE = 0.5;
let blink = BLINK_RATE;

function update(timestamp) {
    
    // https://developer.mozilla.org/en-US/docs/Games/Anatomy
    const t = timestamp / 1000;
    dt = t - last;
    last = t;

    //
    // HUD
    //

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillText(timestamp, TEXT_START, TEXT_TOP);

    ctx.fillText(dt, TEXT_START, TEXT_TOP + TEXT_HEIGHT);
    ctx.fillText(TITLE_TEXT, TEXT_CENTER_X-TITLE_TEXT_WIDTH, TEXT_TOP + TEXT_HEIGHT * 2);

    blink -= dt;
    if (blink > 0.0) {
        ctx.fillText(START_TEXT, TEXT_CENTER_X-START_TEXT_WIDTH, TEXT_CENTER_Y);    
    } else if (blink < -BLINK_RATE) {
        blink = BLINK_RATE;
    }

    ctx.moveTo(TEXT_CENTER_X, 0);
    ctx.lineTo(TEXT_CENTER_X, ctx.canvas.height);
    ctx.moveTo(0, TEXT_CENTER_Y);
    ctx.lineTo(ctx.canvas.width, TEXT_CENTER_Y);
    ctx.stroke();

    //
    // move paddles
    //

    paddle0PrevXPos = paddle0XPos;
    paddle0PrevYPos = paddle0YPos;

    if (keys[KEY_W]) {
        paddle0Dir = 1.0;    
    } else if (keys[KEY_S]) {
        paddle0Dir = -1.0;
    } else {
        paddle0Dir = 0.0;
    }
    
    paddle0YPos = paddle0YPos + (paddle0Dir * PADDLE_SPEED * dt);

    if (paddle0YPos < -MAX_PADDLE_Y) {
        paddle0YPos = -MAX_PADDLE_Y;
    }
    else if (paddle0YPos > MAX_PADDLE_Y) {
        paddle0YPos = MAX_PADDLE_Y;
    }

    if (keys[KEY_I]) {
        paddle1Dir = 1.0;    
    } else if (keys[KEY_K]) {
        paddle1Dir = -1.0;
    } else {
        paddle1Dir = 0.0;
    }

    paddle1PrevXPos = paddle1XPos;
    paddle1PrevYPos = paddle1YPos;

    paddle1YPos = paddle1YPos + (paddle1Dir * PADDLE_SPEED * dt);

    if (paddle1YPos < -MAX_PADDLE_Y) {
        paddle1YPos = -MAX_PADDLE_Y;
    }
    else if (paddle1YPos > MAX_PADDLE_Y) {
        paddle1YPos = MAX_PADDLE_Y;
    }

    ballPrevXPos = ballXPos;
    ballPrevYPos = ballYPos;

    ballXPos = ballXPos + (ballXDir * PADDLE_SPEED * dt);
    if (ballXPos < -MAX_BALL_X) {
        ballXPos = -MAX_BALL_X;
        ballXDir = -ballXDir;
    }
    else if (ballXPos > MAX_BALL_X) {
        ballXPos = MAX_BALL_X;
        ballXDir = -ballXDir;
    }

    ballYPos = ballYPos + (ballYDir * PADDLE_SPEED * dt);
    if (ballYPos < -MAX_BALL_Y) {
        ballYPos = -MAX_BALL_Y;
        ballYDir = -ballYDir;
    }
    else if (ballYPos > MAX_BALL_Y) {
        ballYPos = MAX_BALL_Y;
        ballYDir = -ballYDir;
    }

    //
    // draw
    //

    gl.useProgram(shaders['program1'].program);

    //
    // set projection matrix for use by background
    //

    gl.uniformMatrix4fv(
        shaders['program1']['uniforms']['u_modelviewProjection'],
        false,
        normalizedModelViewProjection
    );    

    // background
    {

        mat4.identity(modelScale);
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Scale'],
            false,
            modelScale
        );

        mat4.identity(modelTranslate);
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Translate'],
            false,
            modelTranslate
        );
    
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers['2x2_rect']['buffer']);
        gl.vertexAttribPointer(
            shaders['program1']['attribs']['a_coords'],
            buffers['2x2_rect']['size'],
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(shaders['program1']['attribs']['a_coords']);
    
        gl.uniform4f(shaders['program1']['uniforms']['u_color'], 1, 0, 0, 1);
    
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffers['2x2_rect']['count']);
    }

    //
    // set projection matrix for use by game objects
    //

    gl.uniformMatrix4fv(
        shaders['program1']['uniforms']['u_modelviewProjection'],
        false,
        modelViewProjection
    );

    // paddle 0
    {
        
        mat4.identity(modelScale);
        mat4.scale(modelScale,
            modelScale,
            [ PADDLE_WIDTH, PADDLE_HEIGHT, 0 ]);
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Scale'],
            false,
            modelScale
        );

        mat4.identity(modelTranslate);
        mat4.translate(modelTranslate,
            modelTranslate,
            [paddle0XPos, paddle0YPos, 0.0]);

        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Translate'],
            false,
            modelTranslate
        );
    
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers['unit_square']['buffer']);
        gl.vertexAttribPointer(
            shaders['program1']['attribs']['a_coords'],
            buffers['unit_square']['size'],
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(shaders['program1']['attribs']['a_coords']);
    
        gl.uniform4f(shaders['program1']['uniforms']['u_color'], 1, 1, 1, 1);
    
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffers['unit_square']['count']);
    }

    // paddle 1
    {
        mat4.identity(modelScale);
        mat4.scale(modelScale,
            modelScale,
            [ PADDLE_WIDTH, PADDLE_HEIGHT, 0 ]);
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Scale'],
            false,
            modelScale
        );

        mat4.identity(modelTranslate);
        mat4.translate(modelTranslate,
            modelTranslate,
            [paddle1XPos, paddle1YPos, 0.0]);

        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Translate'],
            false,
            modelTranslate
        );
    
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers['unit_square']['buffer']);
        gl.vertexAttribPointer(
            shaders['program1']['attribs']['a_coords'],
            buffers['unit_square']['size'],
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(shaders['program1']['attribs']['a_coords']);
    
        gl.uniform4f(shaders['program1']['uniforms']['u_color'], 1, 1, 1, 1);
    
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffers['unit_square']['count']);
    }

    // ball
    {
        mat4.identity(modelScale);
        mat4.scale(modelScale,
            modelScale,
            [ BALL_RADIUS, BALL_RADIUS, 0 ]);
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Scale'],
            false,
            modelScale
        );
    
        mat4.identity(modelTranslate);
        mat4.translate(modelTranslate,
            modelTranslate,
            [ballXPos, ballYPos, 0.0]);

        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_Translate'],
            false,
            modelTranslate
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers['unit_square']['buffer']);
        gl.vertexAttribPointer(
            shaders['program1']['attribs']['a_coords'],
            buffers['unit_square']['size'],
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(shaders['program1']['attribs']['a_coords']);
    
        gl.uniform4f(shaders['program1']['uniforms']['u_color'], 1, 1, 1, 1);
    
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffers['unit_square']['count']);
    }
   
    requestAnimationFrame(update);
}

requestAnimationFrame(setup);

/** @param {WebGLRenderingContext} gl */
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw `unable to link shader program. error: ${gl.getProgramInfoLog(program)}`;
    }
    return program;
}

/** @param {WebGLRenderingContext} gl */
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw `unable to compile shader. error: ${gl.getShaderInfoLog(shader)}`;
    }
    return shader;
}

