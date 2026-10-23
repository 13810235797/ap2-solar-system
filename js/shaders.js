// js/shaders.js — 全部着色器源码（GLSL ES 1.00，WebGL2 向下兼容）
// 共三套：
//   1) texProgram  —— 贴位图纹理的天体（含朝向太阳的简易明暗，非 Phong，AP3 再做完整光照）
//   2) lineProgram  —— 轨道线（gl.LINES）
//   3) pointProgram —— 小行星带（gl.POINTS）

var SHADERS = {};

SHADERS.texVS = `
attribute vec4 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelView;
uniform mat4 uProjection;
uniform mat3 uNormalMat;   // 法线的模型-观察变换（逆转置；此处仅旋转，直接用 mat3）
uniform vec3  uLightEye;    // 光源（太阳）在观察坐标系中的位置
uniform float uAmbient;     // 环境光强度（面板可调）

varying vec2 vTexCoord;
varying float vDiffuse;

void main() {
    vTexCoord = aTexCoord;
    vec3 posEye = (uModelView * aPosition).xyz;
    vec3 N = normalize(uNormalMat * aNormal);
    vec3 L = normalize(uLightEye - posEye);
    // 简易朗伯项 + 可调环境光
    vDiffuse = max(dot(N, L), 0.0) * (1.0 - uAmbient) + uAmbient;
    gl_Position = uProjection * uModelView * aPosition;
}
`;

SHADERS.texFS = `
precision mediump float;

uniform sampler2D uTex;
uniform float uEmissive;   // 太阳 = 1（自发光，不受光照衰减）；其余 = 0

varying vec2 vTexCoord;
varying float vDiffuse;

void main() {
    vec4 c = texture2D(uTex, vTexCoord);
    float lit = mix(vDiffuse, 1.0, uEmissive);
    gl_FragColor = vec4(c.rgb * lit, 1.0);
}
`;

SHADERS.lineVS = `
attribute vec4 aPosition;
uniform mat4 uMVP;
void main() {
    gl_Position = uMVP * aPosition;
}
`;

SHADERS.lineFS = `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = uColor;
}
`;

SHADERS.pointVS = `
attribute vec4 aPosition;
uniform mat4 uMVP;
uniform float uPointSize;
void main() {
    gl_PointSize = uPointSize;
    gl_Position = uMVP * aPosition;
}
`;

SHADERS.pointFS = `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = uColor;
}
`;
