"use strict";

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function generateBackground(width, height) {
    const background = new ImageData(width, height);
    for (let i = 0; i < background.data.length; i += 4) {
        let v;
        if (Math.random() < 0.001)
            v = 255;
        else
            v = 0
        background.data[i + 0] = v;
        background.data[i + 1] = v;
        background.data[i + 2] = v;
        background.data[i + 3] = 255;
    }
    return background;
}

function generateColor() {
    const r = randInt(0, 256);
    const b = randInt(0, 256 - r);
    const g = 255 - r - b;
    return `rgb(${r}, ${g}, ${b})`;
}

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    addEq(vec) {
        this.x += vec.x;
        this.y += vec.y;
    }

    sub(vec) {
        return new Vector(vec.x - this.x, vec.y - this.y);
    }

    mul(s) {
        return new Vector(this.x * s, this.y * s);
    }

    div(s) {
        return new Vector(this.x / s, this.y / s);
    }

    clone() {
        return new Vector(this.x, this.y);
    }

    abs() {
        return Math.hypot(this.x, this.y);
    }

    distance(vec) {
        return Math.hypot(this.x - vec.x, this.y - vec.y);
    }

    normalized() {
        return this.clone().div(this.abs());
    }

    normalTo(vec) {
        return this.sub(vec).normalized();
    }
}

class CelestialBody {
    constructor(x, y, radius, density) {
        this.position = new Vector(x, y);
        this.velocity = new Vector();

        this.radius = radius;
        this.mass = density * radius ** 2;
        this.color = generateColor();
        this.destroy = false;
        this.trail = [];
    }

    draw(context) {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        context.fill();

        if (this.trail.length) {
            context.strokeStyle = this.color;
            context.lineWidth = 2;
            context.moveTo(this.trail[0].x, this.trail[0].y);
            for (const p of this.trail) {
                context.lineTo(p.x, p.y);
            }
            context.stroke();
        }
    }

    update() {
        this.position.addEq(this.velocity);
        this.trail.push(this.position.clone());
        if (this.trail.length > 1000)
            this.trail.shift();
    }
}

class Universe {
    constructor() {
        this.g = .1;
        this.celestialbodies = [];
        this.paused = false;
    }

    draw(context) {
        for (const body of this.celestialbodies) {
            body.draw(context);
        }
    }

    update() {
        if (!this.paused) {
            for (const body1 of this.celestialbodies)
                for (const body2 of this.celestialbodies)
                    if (body1 !== body2) {
                        const distance = body1.position.distance(body2.position);
                        if (distance < body1.radius + body2.radius) {
                            if (collisions) {
                              const nx = (body1.position.x - body2.position.x) / distance;
                              const ny = (body1.position.y - body2.position.y) / distance;

                              const tx = -ny;
                              const ty = nx;

                              const dptan1 = body2.velocity.x * tx + body2.velocity.y * ty;
                              const dptan2 = body1.velocity.x * tx + body1.velocity.y * ty;

                              const dpnorm1 = body2.velocity.x * nx + body2.velocity.y * ny;
                              const dpnorm2 = body1.velocity.x * nx + body1.velocity.y * ny;

                              const m1 = (dpnorm1 * (body2.mass - body1.mass) + 2 * body1.mass * dpnorm2) / (body1.mass + body2.mass);
                              const m2 = (dpnorm2 * (body1.mass - body2.mass) + 2 * body2.mass * dpnorm1) / (body1.mass + body2.mass);

                              body1.position.addEq(body1.velocity.mul(-1));
                              body2.position.addEq(body2.velocity.mul(-1));

                              body2.velocity.x = tx * dptan1 + nx * m1;
                              body2.velocity.y = ty * dptan1 + ny * m1;
                              body1.velocity.x = tx * dptan2 + nx * m2;
                              body1.velocity.y = ty * dptan2 + ny * m2;
                            }
                            else {
                              if (body1.radius < body2.radius) {
                                  body1.destroy = true;
                                  body2.radius += body1.radius;
                              }
                              else {
                                  body2.destroy = true;
                                  body1.radius += body2.radius;
                              }
                            }
                        }
                        else {
                            const magnitude = this.g * body2.mass / distance ** 2;
                            body1.velocity.addEq(body1.position.normalTo(body2.position).mul(magnitude));
                        }
                    }

            this.celestialbodies = this.celestialbodies.filter(b => !b.destroy);

            for (const body of this.celestialbodies) {
                body.update();
            }
        }
    }

    get tail() {
        return this.celestialbodies[this.celestialbodies.length - 1];
    }

    addBody(body) {
        this.celestialbodies.push(body);
    }
}

const collide = document.getElementById("collide");
const radius = document.getElementById("r");
const density = document.getElementById("d");
const add = document.getElementById("add");
const playPause = document.getElementById("playpause");
const editG = document.getElementById("G");
const canvas = document.getElementById("display")
const context = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

const background = generateBackground(canvas.width, canvas.height);
const universe = new Universe();

let collisions = false;
let adding = false;
let dragging = false;
const pos = { x: 0, y: 0 };

playPause.onclick = playOrPause;

editG.oninput = () => {
    universe.g = +editG.value || .1;
};

collide.oninput = () => {
  collisions = collide.checked;
}

add.onclick = () => {
    adding = !adding;
    if (adding) {
        playPause.innerText = "play_circle_outline";
        universe.paused = true;
    }
};

addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    pos.x = e.clientX - rect.x;
    pos.y = e.clientY - rect.y;
});

canvas.addEventListener("mousedown", () => {
    if (adding) {
        universe.addBody(new CelestialBody(pos.x, pos.y, +radius.value || 25, +density.value || 1));
        dragging = true;
    }
});

canvas.addEventListener("mouseup", e => {
    if (adding && dragging) {
        const rect = canvas.getBoundingClientRect();
        pos.x = e.clientX - rect.x;
        pos.y = e.clientY - rect.y;

        universe.tail.velocity = universe.tail.position.sub(pos).div(60);
        dragging = false;
    }
});

requestAnimationFrame(frame);

document.getElementById("orbit").onclick = () => {
    universe.celestialbodies.splice(0, universe.celestialbodies.length);
    universe.addBody(new CelestialBody(canvas.width / 2, canvas.height / 2, 50, 100));
    universe.addBody(new CelestialBody(canvas.width / 2 - 350, canvas.height / 2, 10, 1));
    universe.tail.velocity = new Vector(0, 7);
};

document.getElementById("twobodies").onclick = () => {
    universe.celestialbodies.splice(0, universe.celestialbodies.length);
    universe.addBody(new CelestialBody(canvas.width * 0.3, canvas.height / 2, 25, 10));
    universe.tail.velocity = new Vector(0, 2);
    universe.addBody(new CelestialBody(canvas.width * 0.4, canvas.height / 2, 25, 10));
    universe.tail.velocity = new Vector(0, -2);
};

document.getElementById("threebodies").onclick = () => {
    universe.celestialbodies.splice(0, universe.celestialbodies.length);
    universe.addBody(new CelestialBody(canvas.width * 0.25, canvas.height * 0.25, 10, 0.011));
    universe.addBody(new CelestialBody(canvas.width * 0.25, canvas.height * 0.25 + 100, 10, 0.00907));
};

function frame() {
    requestAnimationFrame(frame);

    context.putImageData(background, 0, 0);
    if (adding) {
        if (dragging) {
            context.strokeStyle = "white";
            context.lineWidth = 4;
            context.beginPath();
            context.moveTo(pos.x, pos.y);
            context.lineTo(universe.tail.position.x, universe.tail.position.y);
            context.stroke();
        }
        else {
            context.beginPath();
            context.fillStyle = "rgba(75, 75, 75, 75)";
            context.arc(pos.x, pos.y, +radius.value || 25, 0, Math.PI * 2);
            context.fill();
        }
    }
    universe.draw(context);
    universe.update();
}

function playOrPause() {
    playPause.innerText = universe.paused ? "pause_circle_outline" : "play_circle_outline";
    universe.paused = !universe.paused;
}
