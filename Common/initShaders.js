// initShaders.js — 教材配套：编译链接着色器程序并返回 program
// gl: WebGLRenderingContext, vertexShaderId/fragmentShaderId: <script> 标签 id
function initShaders(gl, vertexShaderId, fragmentShaderId) {
    var vertShdr, fragShdr;
    var vertElem = document.getElementById(vertexShaderId);
    var fragElem = document.getElementById(fragmentShaderId);
    if (!vertElem) {
        console.error("Unable to find vertex shader " + vertexShaderId);
        return null;
    }
    if (!fragElem) {
        console.error("Unable to find fragment shader " + fragmentShaderId);
        return null;
    }

    function compile(type, src) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error("Shader compile error:\n" + gl.getShaderInfoLog(sh) + "\n" + src);
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }

    vertShdr = compile(gl.VERTEX_SHADER, vertElem.text);
    fragShdr = compile(gl.FRAGMENT_SHADER, fragElem.text);
    if (!vertShdr || !fragShdr) return null;

    var program = gl.createProgram();
    gl.attachShader(program, vertShdr);
    gl.attachShader(program, fragShdr);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader link error:\n" + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

// 直接从源码字符串编译（便于把 shader 集中在 js/shaders.js 管理）
function initShadersFromSource(gl, vertSrc, fragSrc) {
    function compile(type, src) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error("Shader compile error:\n" + gl.getShaderInfoLog(sh) + "\n" + src);
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }
    var v = compile(gl.VERTEX_SHADER, vertSrc);
    var f = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("Program link error:\n" + gl.getProgramInfoLog(p));
        return null;
    }
    return p;
}
