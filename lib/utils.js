function Vec3(x, y, z) {
    "use strict";
    this.x = x;
    this.y = y;
    this.z = z;
}

// creates a shader Program directly from source with the given context
function createProgramFromSource(vertexSource, fragmentSource, ctx) {
    var vs = createShaderFromSource(vertexSource,   "vert", ctx);
    var fs = createShaderFromSource(fragmentSource, "frag", ctx);
    
    var Program = ctx.createProgram();
    
    ctx.attachShader(Program, vs);
    ctx.attachShader(Program, fs);
    ctx.linkProgram(Program);


    if (!ctx.getProgramParameter(Program, ctx.LINK_STATUS)) 
    {
        alert("Could not initialise shaders");
        return null;
    }

    return Program;
}

function createShaderFromSource(source, type, ctx) {
        var shader;
        if (shaderScript.type == "frag") {
            shader = ctx.createShader(ctx.FRAGMENT_SHADER);
        } else if (shaderScript.type == "vert") {
            shader = ctx.createShader(ctx.VERTEX_SHADER);
        } else {
            return null;
        }
        ctx.shaderSource(shader, source);
        ctx.compileShader(shader);

        if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
            alert(ctx.getShaderInfoLog(shader) + "  " + id);
            return null;
        }

        return shader;
}
