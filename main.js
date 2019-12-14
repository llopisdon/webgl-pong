import { mat4 } from "./node_modules/gl-matrix/esm/index.js";

console.log(">>> init main.js <<<");

// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage
/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#canvas");
/** @type {WebGLRenderingContext} */
const gl = canvas.getContext("webgl");

if (!gl) {
    throw "Unable to init WebGL!";
} else {
    console.log("WebGL init...")
}

const NES_WIDTH = 256;
const NES_HEIGHT = 240;

let dt = 0;
let last = 0;

let shaders = [];
let buffers = {};

const normalizedModelViewProjection = mat4.create();
console.log(normalizedModelViewProjection);
const modelViewProjection = mat4.create();
const modelScale = mat4.create();

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

let keys = {};

document.addEventListener("keydown", e => {
    console.log(`keydown -> key: ${e.key} code: ${e.code}`);
    if ( [KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_ARROW_UP, KEY_ARROW_DOWN].indexOf(e.key) >= 0) {
        e.preventDefault();
    }
    keys[e.key] = true;
});

document.addEventListener("keyup", e => {
    console.log(`keyup -> key: ${e.key} code: ${e.code}`);
    keys[e.key] = false;
});

// TODO add responsive canvas

function setup() {
    
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
        uniform mat4 u_S;
        uniform vec4 u_color;
        varying lowp vec4 v_color;
        void main() {
            gl_Position = u_modelviewProjection * u_S * a_coords;
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
                'u_S': gl.getUniformLocation(program, 'u_S'),
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
        const R = 100;
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
}

let pulseAngle = 0.0;
const PI_OVER_2 = Math.PI / 2;
const DEG_30 = 30 * (Math.PI / 180);
let pulseDir = 1.0;

function update(timestamp) {

    // https://developer.mozilla.org/en-US/docs/Games/Anatomy
    const t = timestamp / 1000;
    dt = t - last;
    last = t;
    
    gl.useProgram(shaders['program1'].program);

    gl.uniformMatrix4fv(
        shaders['program1']['uniforms']['u_modelviewProjection'],
        false,
        normalizedModelViewProjection
    );

    {
        mat4.identity(modelScale);
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_S'],
            false,
            modelScale
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
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_modelviewProjection'],
            false,
            modelViewProjection
        );    
    }

    // paddle 0
    {
        mat4.identity(modelScale);
        mat4.scale(modelScale,
            modelScale,
            [ 20, 75, 0 ]);
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_S'],
            false,
            modelScale
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
            [ 20, 75, 0 ]);
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_S'],
            false,
            modelScale
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
            [ 20, 20, 0 ]);
    
        gl.uniformMatrix4fv(
            shaders['program1']['uniforms']['u_S'],
            false,
            modelScale
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
    
        gl.uniform4f(shaders['program1']['uniforms']['u_color'], 1, 0, 1, 1);
    
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

