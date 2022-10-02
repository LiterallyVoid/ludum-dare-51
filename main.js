const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let ScaleFactor = 1;

let audioCtx;

const sounds = {
};

function initAudio() {
	for (const name of [
		"player-hurt",
		"railgun-1",
		"railgun-2",
		"railgun-3",
		"rocket-explode",
		"rocket-fire",
		"sniper-attack",
		"shotgun-fire",
		"shotgun-mech",
	]) {
		sounds[name] = [];
		for (let i = 0; i < 6; i++) {
			const aud = document.createElement("audio");
			aud.src = "sounds/" + name + ".ogg";
			aud.preload = "auto";

			document.body.appendChild(aud);

			const source = new MediaElementAudioSourceNode(audioCtx, { mediaElement: aud });
			const gainNode = new GainNode(audioCtx);
			source.connect(gainNode).connect(audioCtx.destination);

			sounds[name].push({
				audio: aud,
				gainNode,
			});
		}
	}
}

const mainGain = 0.3;

function playSound(name, gain = 1.0, delay = 0.0) {
	if (!audioCtx) {
		return;
	}

	if (!game || game.over) {
		return;
	}

	let aud = sounds[name].pop();
	if (!aud) return;

	/* gain: */ aud.gainNode.gain /* a-rate param */ .value /* float */ = /* audio gain */ gain * mainGain /* gain! */;

	function play() {
		aud.audio.play();
		aud.audio.addEventListener("ended", () => {
			sounds[name].push(aud);
		}, { once: true });
	}

	if (delay > 0.0) {
		setTimeout(() => {
			play();
		}, delay * 1000);
	} else {
		play();
	}
}

const actionsPressed = {
};

let actionsJustPressed = {
};

let mousePosition = [0, 0];

const DEBUG = false;

const UNIT = 30;

function distance(a, b) {
	return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
}

const paths = {
	sword: new Path2D("M 19 -8 L 16.75 -2 L 9 -2 L 6 -5 L 1 0 L 6 5 L 9 2 L 16.75 2 L 19 8 L 25 8 L 23.125 3 L 54 3 L 61 0 L 54 -3 L 23.125 -3 L 25 -8 L 19 -8 z "),
};

const items = {
	rocket: {
		icon: new Path2D("M 37 6 C 37 6 33.999998 6.000002 32 8 L 16 24 L 24 32 L 40 16 C 41.999998 14.000002 42 11 42 11 L 37 6 z M 16 16 L 10 24 L 14 24 L 22 16 L 16 16 z M 32 26 L 24 34 L 24 38 L 32 32 L 32 26 z M 17 27 C 12.000005 27 7 32 7 32 L 12 32 C 9.000003 32.999999 5 43 5 43 C 5 43 14.000002 39.999996 16 36 L 16 41 C 16 41 21 35.999995 21 31 L 17 27 z "),
		fgBlur: "#940",
		fg: "#F64",

		fire(player) {
			const rocket = new Rocket(player.game);

			rocket.position = [player.position[0], player.position[1]];

			rocket.velocity = [player.forward[0] * 30, player.forward[1] * 30];

			player.game.entities.push(rocket);

			playSound("rocket-fire");
		}
	},
	railgun: {
		icon: new Path2D("M 24 4 L 9 33 L 31 5 L 24 4 z M 35 6 L 12 32 C 8.000004 35.999996 7 41 7 41 C 7 41 12.000004 39.999996 16 36 L 42 13 L 40 8 L 35 6 z M 43 16 L 15 39 L 42 24 L 43 16 z "),
		fgBlur: "#0A8",
		fg: "#6FD",

		fire(player) {
			playSound("railgun-1", 0.5, 0.2);
			playSound("railgun-2", 0.5);
			playSound("railgun-3", 1, 0.05);

			for (const entity of player.game.traceRay(player.position, player.forward, 1.5)) {
				if (entity[1].isEnemy) {
					entity[1].dead = true;
					player.game.score++;
				}
			}

			{
				const start = [
					player.position[0] * UNIT,
					player.position[1] * UNIT
				];

				const end = [
					player.position[0] * UNIT + player.forward[0] * 2000,
					player.position[1] * UNIT + player.forward[1] * 2000
				];

				let particles = [];

				for (let i = 0; i < 100; i++) {
					let along = Math.random();
					let aside = Math.random();

					let point = [
						start[0] * (1 - along) + end[0] * along,
						start[1] * (1 - along) + end[1] * along,
					];

					/* I AM 28 hours into a 48 hour JAM !! (very roughly) forgive my terrible code pls */
					const aside2 = aside;

					aside *= (Math.random() < 0.5 ? -1 : 1) * 50;

					point[0] -= player.forward[1] * aside;
					point[1] += player.forward[0] * aside;

					const len = Math.random() * 100 + 100;

					particles.push([point[0], point[1], point[0] + player.forward[0] * len, point[1] + player.forward[1] * len, 1 - aside2]);
				}

				let ratio = 1;

				player.game.effects.push((delta) => {
					ctx.save();

					ctx.lineCap = "round";

					for (const particle of particles) {
						const pratio = particle[4] + (ratio - 1.0);
						if (pratio <= 0.0) {
							continue;
						}

						const size = 50 * pratio;

						ctx.strokeStyle = "#0F8";
						ctx.lineWidth = size;

						ctx.beginPath();
						ctx.moveTo(particle[0], particle[1]);
						ctx.lineTo(particle[2], particle[3]);
						ctx.stroke();
					}

					ctx.strokeStyle = "#AFF";
					ctx.lineWidth = 40 * Math.pow(ratio, 4.0);

					ctx.beginPath();
					ctx.moveTo(start[0], start[1]);
					ctx.lineTo(end[0], end[1]);
					ctx.stroke();

					ctx.restore();

					ratio -= delta * 2.0;

					return ratio > 0.0;
				});
			}
		},
	},
	shotgun: {
		icon: new Path2D("M 24.707031,-0.04101562 7.7363281,16.929688 14.099609,23.292969 31.070312,6.3222656 Z M 33.193359,8.4433594 16.222656,25.414062 22.585938,31.777344 39.556641,14.806641 Z m 8.484375,8.4863286 -16.970703,16.970703 6.363281,6.363281 16.970704,-16.970703 z M 6.3222656,18.34375 2.0800781,22.585938 1.3730469,21.878906 -0.04101562,23.292969 7.7363281,31.070312 9.1503906,29.65625 8.4433594,28.949219 12.685547,24.707031 Z m 8.4843754,8.484375 -4.242188,4.242187 -0.7070311,-0.707031 -1.4140625,1.414063 7.7792966,7.779297 1.414063,-1.414063 -0.707031,-0.707031 4.242187,-4.242188 z m 8.486328,8.486328 -4.242188,4.242188 -0.707031,-0.707032 -1.414062,1.414063 7.777343,7.777344 1.414063,-1.414063 -0.707032,-0.707031 4.242188,-4.242188 z"),
		fgBlur: "#EA0",
		fg: "#FE0",

		fire(player) {
			playSound("shotgun-fire", 0.4);
			playSound("shotgun-mech", 0.7, 0.2);

			let hasHit = new Set();

			for (let i = 0; i < 12; i++) {
				let angle = Math.random() * 0.4 - 0.2;
				let s = Math.sin(angle);
				let c = Math.cos(angle);

				let direction = [
					player.forward[0] * c - player.forward[1] * s,
					player.forward[1] * c + player.forward[0] * s
				];

				let distance = 300.001;

				for (const entity of player.game.traceRay(player.position, direction, 0.2)) {
					if (entity[1].isEnemy && !hasHit.has(entity[1])) {
						hasHit.add(entity[1]);
						entity[1].dead = true;
						player.game.score++;
						distance = entity[0];
						break;
					}
				}

				{
					let start = [player.position[0] * UNIT, player.position[1] * UNIT];
					let end = [start[0] + direction[0] * distance * UNIT, start[1] + direction[1] * distance * UNIT];

					let time = 0.15;

					player.game.effects.push((delta) => {
						ctx.save();
						ctx.lineWidth = (time / 0.15) * 6;
						ctx.strokeStyle = "#FA0";

						ctx.beginPath();
						ctx.moveTo(start[0], start[1]);
						ctx.lineTo(end[0], end[1]);
						ctx.stroke();
						ctx.restore();

						time -= delta;

						return time > 0;
					});
				}
			}
		},
	},
};

function effect_pop(entity) {
	const particles = [];

	for (let i = 0; i < 12; i++) {
		particles.push([entity.position[0] * UNIT, entity.position[1] * UNIT, Math.random() * Math.PI * 2, Math.random() * 1000]);
	}

	let time = 1;
	return (delta) => {
		for (const particle of particles) {
			particle[0] += Math.cos(particle[2]) * particle[3] * delta;
			particle[1] += Math.sin(particle[2]) * particle[3] * delta;

			particle[3] *= Math.pow(0.5, delta * 20.0);

			ctx.fillStyle = "#00F";

			ctx.save();
			ctx.translate(particle[0], particle[1]);
			ctx.rotate(particle[2]);

			ctx.scale(1, 0.3);

			ctx.beginPath();
			ctx.arc(0, 0, 40 * Math.pow(time, 0.5), 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		time -= delta;

		return time > 0;
	};
}

class Entity {
	constructor(game) {
		this.game = game;

		this.position = [0, 0];
		this.velocity = [0, 0];
		this.radius = 1;
		this.drawRadius = 1;

		this.bump = true;
		this.isEnemy = false;

		this.concussed = false;
		this.concussionTimer = 0;
	}

	activateReaperMode() {}

	grabbed() {
		return this.game.player.grabbing === this;
	}

	update(delta) {
		if (this.concussed) {
			this.velocity[0] *= Math.pow(0.5, delta * 3.0);
			this.velocity[1] *= Math.pow(0.5, delta * 3.0);

			if (!this.grabbed()) {
				this.concussionTimer += delta;
				if (this.concussionTimer > 30) {
					this.dead = true;
				}
			}
		} else {
			this.concussionTimer = 0;
		}

		this.position[0] += this.velocity[0] * delta;
		this.position[1] += this.velocity[1] * delta;

		if (this.position[0] < -this.game.arenaWidth / 2 + this.radius) {
			this.position[0] = -this.game.arenaWidth / 2 + this.radius;
			this.velocity[0] = Math.abs(this.velocity[0]) * 0.5;
		}

		if (this.position[0] > this.game.arenaWidth / 2 - this.radius) {
			this.position[0] = this.game.arenaWidth / 2 - this.radius;
			this.velocity[0] = Math.abs(this.velocity[0]) * -0.5;
		}

		if (this.position[1] < -this.game.arenaHeight / 2 + this.radius) {
			this.position[1] = -this.game.arenaHeight / 2 + this.radius;
			this.velocity[1] = Math.abs(this.velocity[1]) * 0.5;
		}

		if (this.position[1] > this.game.arenaHeight / 2 - this.radius) {
			this.position[1] = this.game.arenaHeight / 2 - this.radius;
			this.velocity[1] = Math.abs(this.velocity[1]) * -0.5;
		}
	}

	drawShadow() {
		ctx.fillStyle = "#204030";

		ctx.beginPath();
		ctx.arc(this.position[0] * UNIT, this.position[1] * UNIT, this.drawRadius * UNIT, 0, Math.PI * 2);
		ctx.fill();
	}

	drawPre() {
	}

	draw() {
	}

	drawPost() {
		if (DEBUG) {
			ctx.strokeStyle = "#F00";

			ctx.lineWidth = 1;

			ctx.beginPath();
			ctx.arc(this.position[0] * UNIT, this.position[1] * UNIT, this.radius * UNIT, 0, Math.PI * 2);
			ctx.stroke();
		}
	}

	checkCollision(delta, other) {
		if (distance(this.position, other.position) < this.radius + other.radius) {
			this.collide(delta, other);
		}
	}

	collide(delta, other) {
		if (!this.bump || !other.bump) {
			return;
		}

		const direction = [this.position[0] - other.position[0], this.position[1] - other.position[1]];
		const distance = Math.sqrt(direction[0] * direction[0] + direction[1] * direction[1]);

		const force = ((this.radius + other.radius) - distance) * 100;

		this.velocity[0] += direction[0] * force * delta;
		this.velocity[1] += direction[1] * force * delta;
	}
}

class WeaponPickup extends Entity {
	constructor(game, item) {
		super(game);
		this.radius = 1;

		this.item = item;

		this.bump = false;
		this.ammo = 4;
	}

	drawShadow() {
	}

	drawPost() {
		super.drawPost();

		ctx.save();
		ctx.translate(this.position[0] * UNIT, this.position[1] * UNIT);

		ctx.scale(2, 2);
		ctx.translate(-24, -24);

		ctx.shadowColor = items[this.item].fgBlur;
		ctx.shadowBlur = 8;

		ctx.fillStyle = items[this.item].fg;
		ctx.fill(items[this.item].icon);

		ctx.restore();
	}

	heldDraw() {
		for (let i = 0; i < this.ammo; i++) {
			ctx.save();

			const x = (i + 0.5) - (this.ammo / 2);

			ctx.translate(0, -UNIT * 1.3);

			ctx.scale(0.8, 0.8);
			ctx.translate(-24 + x * 48, -24);

			ctx.shadowColor = items[this.item].fgBlur;
			ctx.shadowBlur = 2;

			ctx.fillStyle = items[this.item].fg;
			ctx.fill(items[this.item].icon);

			ctx.restore();
		}
	}

	heldUpdate(delta, player) {
		if (actionsJustPressed.attack) {
			items[this.item].fire(player);
			this.ammo--;
		}

		if (this.ammo === 0) {
			this.empty = true;
		}
	}
}

class Rocket extends Entity {
	constructor(game) {
		super(game);

		this.bump = false;
		this.radius = 0.5;

		this.gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
		this.gradient.addColorStop(0, "#FFF");
		this.gradient.addColorStop(1, "#FF880000");

		this.game.effects.push(this.trail());

		this.expradius = 8;

		this.time = 2;
	}

	update(delta) {
		this.time -= delta;

		if (this.time < 0) {
			this.explode();
		}

		super.update(delta);
	}

	trail() {
		const total = 50;
		const particles = [];

		let tick = 0;

		return (delta) => {
			if (particles.length > 0 && particles[0][5] > 1) {
				particles.shift();
			}

			const vel = 300;
			const hvel = vel / 2;

			tick += delta;

			if (!this.dead) {
				while (tick > 0.02) {
					tick -= 0.02;

					particles.push([this.position[0] * UNIT, this.position[1] * UNIT, Math.random() * vel - hvel, Math.random() * vel - hvel, Math.random() * 30, 0.0]);
				}
			}

			ctx.save();
			ctx.fillStyle = "#FFF";

			const damp = Math.pow(0.5, delta * 5.0);

			for (let i = 0; i < particles.length; i++) {
				const particle = particles[i];

				particle[0] += particle[2] * delta;
				particle[1] += particle[3] * delta;

				particle[2] *= damp;
				particle[3] *= damp;

				const ratio = particle[5];

				ctx.fillStyle = "rgba(255, 255, 255, " + ((1.0 - ratio) * 100) + "%)";

				const sizeRatio = Math.pow(ratio, 0.1);

				ctx.beginPath();
				ctx.arc(particle[0], particle[1], particle[4] * sizeRatio, 0, Math.PI * 2);
				ctx.fill();

				particle[5] += delta * 3;
			}
			ctx.restore();

			if (this.dead && particles.length === 0) {
				return false;
			}

			return true;
		};
	}

	collide(delta, other) {
		if (other.isEnemy) {
			this.explode();
		}
	}

	explode() {
		playSound("rocket-explode");

		this.dead = true;

		for (const entity of this.game.entities) {
			if (entity.isEnemy && distance(entity.position, this.position) < this.expradius) {
				entity.dead = true;
				this.game.score++;
			}
		}

		this.game.effects.push(this.explosion());
	}

	explosion() {
		let time = 0;

		return (delta) => {
			ctx.save();
			ctx.translate(this.position[0] * UNIT, this.position[1] * UNIT);

			ctx.strokeStyle = "#FA0";

			ctx.lineWidth = 80 * Math.pow(1.0 - time, 2);
			const size = 1.0 - Math.pow(0.5, time * 10.0);

			ctx.beginPath();
			ctx.arc(0, 0, (this.expradius - 1) * UNIT * size, 0, Math.PI * 2);
			ctx.stroke();

			ctx.restore();

			time += delta * 2;

			return time < 1;
		};
	}

	drawPost() {
		ctx.save();

		const s = Math.random() * 0.2 + 0.5;

		ctx.translate(this.position[0] * UNIT, this.position[1] * UNIT);
		ctx.scale(s, s);

		ctx.fillStyle = this.gradient;

		ctx.beginPath();
		ctx.arc(0, 0, 100, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();

		super.drawPost();
	}
}

class Player extends Entity {
	constructor(game) {
		super(game);
		this.radius = 1;

		this.weapon = null;
		this.grabbing = null;
		this.hover = null;

		this.forward = [0, 0];

		this.health = 6;
		this.maxHealth = 6;

		this.pipFlourish = [0, 0, 0, 0, 0, 0];

		this.lastScore = 0;
		this.scoreFlourish = 0;
	}

	damage(dmg) {
		if (this.dead) return;

		playSound("player-hurt");

		dmg = Math.round(dmg);

		dmg = Math.min(this.health, dmg);
		dmg = Math.max(0, dmg);

		this.health -= dmg;
		for (let i = this.health; i < this.health + dmg; i++) {
			this.pipFlourish[i] = 1;
		}

		if (this.health === 0) {
			this.dead = true;
		}
	}

	collide(delta, other) {
		super.collide(delta, other);

		if (other instanceof WeaponPickup && this.weapon === null) {
			this.weapon = other;
			other.dead = true;
		}
	}

	drawHud(delta) {
		ctx.save();

		ctx.translate(0, canvas.height);

		const pipWidth = 60;
		const pipHeight = 30;
		const pipTilt = 16;

		const gap = 4;

		const border = 10;

		ctx.translate(border, -border);

		ctx.fillStyle = "#FF4";

		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		if (game.score !== this.lastScore) {
			this.scoreFlourish = 1;
			this.lastScore = game.score;
		}

		ctx.font = "italic 700 48px Saira, sans-serif";
		ctx.fillText("SCORE: " + game.score, 20, -pipHeight - 5);

		if (this.scoreFlourish > 0) {
			ctx.lineWidth = Math.pow(this.scoreFlourish, 3) * 30;
			ctx.strokeStyle = "#FFF";

			ctx.strokeText("SCORE: " + game.score, 20, -pipHeight - 5);

			this.scoreFlourish -= delta * 4;
		}

		ctx.shadowBlur = 6;
		ctx.shadowColor = "#900";
		ctx.fillStyle = "#F44";

		for (let i = 0; i < this.maxHealth; i++) {
			if (i >= this.health) {
				ctx.shadowColor = "#000";
				ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
			}

			const flourish = this.pipFlourish[i];

			if (flourish > 0) {
				this.pipFlourish[i] -= delta * 6;

				const g = 128 + 128 * flourish;
				const a = 0.5 + 0.5 * flourish;

				ctx.fillStyle = `rgba(${g}, ${g}, ${g}, ${a})`;
			}

			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(pipWidth, 0);
			ctx.lineTo(pipWidth + pipTilt, -pipHeight);
			ctx.lineTo(pipTilt, -pipHeight);
			ctx.fill();

			if (flourish > 0) {
				ctx.save();

				ctx.shadowBlur = 0;
				ctx.fillStyle = "rgba(255, 64, 64, " + flourish + ")";

				const extraH = Math.pow(1 - flourish, 0.5) * 4;

				ctx.beginPath();
				ctx.moveTo(0 - pipTilt * extraH, pipHeight * extraH);
				ctx.lineTo(pipWidth - pipTilt * extraH, pipHeight * extraH);
				ctx.lineTo(pipWidth + pipTilt + pipTilt * extraH, -pipHeight * (1 + extraH));
				ctx.lineTo(pipTilt + pipTilt * extraH, -pipHeight * (1 + extraH));
				ctx.fill();

				ctx.restore();
			}

			ctx.translate(pipWidth + gap, 0);
		}

		ctx.restore();
	}

	drawPre() {
		if (this.grabbing !== null) {
			const distance = 20;

			const start = [
				this.grabbing.position[0] * UNIT,
				this.grabbing.position[1] * UNIT,
			];

			const end = [
				this.grabbing.position[0] * UNIT + this.forward[0] * UNIT * distance,
				this.grabbing.position[1] * UNIT + this.forward[1] * UNIT * distance,
			];

			ctx.save();

			const gradient = ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
			gradient.addColorStop(0, "#3AF");
			gradient.addColorStop(1, "#33AAFF00");

			ctx.strokeStyle = gradient;

			ctx.shadowColor = "#3AF";
			ctx.shadowBlur = 6;

			ctx.lineWidth = UNIT * 0.3;

			function interp(position) {
				return [
					start[0] * (1 - position) + end[0] * position,
					start[1] * (1 - position) + end[1] * position,
				];
			}

			const startOffset = (game.time * 2.0) % 1.0;

			const steps = 6;

			function point(index) {
				let ratio = (index + (startOffset * 2) - 2) / ((steps - 1) * 2);
				ratio = Math.max(0, ratio);

				ratio = (1.0 - Math.pow(0.5, ratio)) * 2.0;

				return interp(ratio);
			}

			for (let i = 0; i < steps; i++) {
				const segmentStart = point(i * 2);
				const segmentEnd = point(i * 2 + 1);

				ctx.beginPath();
				ctx.moveTo(segmentStart[0], segmentStart[1]);
				ctx.lineTo(segmentEnd[0], segmentEnd[1]);
				ctx.stroke();
			}

			ctx.restore();
		}

		if (this.weapon !== null) {
			ctx.save();

			const start = [this.position[0] * UNIT, this.position[1] * UNIT];
			const end = [
				this.position[0] * UNIT + this.forward[0] * 500,
				this.position[1] * UNIT + this.forward[1] * 500,
			];
			const gradient = ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
			gradient.addColorStop(0, "#FF6666");
			gradient.addColorStop(1, "#FF666600");

			ctx.strokeStyle = gradient;
			ctx.shadowColor = "#F00";
			ctx.shadowBlur = 4;

			ctx.lineWidth = 3;

			ctx.beginPath();
			ctx.moveTo(start[0], start[1]);
			ctx.lineTo(end[0], end[1]);
			ctx.stroke();

			ctx.restore();
		}

		super.drawPre();
	}

	draw() {
		ctx.fillStyle = "#3AF";

		ctx.beginPath();
		ctx.arc(this.position[0] * UNIT, this.position[1] * UNIT, this.drawRadius * UNIT, 0, Math.PI * 2);
		ctx.fill();

		super.draw();
	}

	drawPost() {
		if (this.hover !== null) {
			ctx.save();
			ctx.strokeStyle = "#3AF";

			ctx.shadowColor = "#3AF";
			ctx.shadowBlur = 6;

			ctx.lineWidth = UNIT * 0.3;

			ctx.translate(this.hover.position[0] * UNIT, this.hover.position[1] * UNIT);

			ctx.beginPath();
			ctx.arc(0, 0, this.hover.radius * UNIT, 0, Math.PI * 2);
			ctx.stroke();

			ctx.restore();
		}

		if (this.weapon === null) {
			super.drawPost();
			return;
		}

		ctx.save();
		ctx.translate(this.position[0] * UNIT, this.position[1] * UNIT);
		this.weapon.heldDraw();
		ctx.restore();

		super.drawPost();
	}

	update(delta) {
		this.velocity[0] *= Math.pow(0.5, delta * 15.0);
		this.velocity[1] *= Math.pow(0.5, delta * 15.0);

		const acceleration = [0, 0];

		if (actionsPressed.up) {
			acceleration[1] -= 1;
		}

		if (actionsPressed.down) {
			acceleration[1] += 1;
		}

		if (actionsPressed.left) {
			acceleration[0] -= 1;
		}

		if (actionsPressed.right) {
			acceleration[0] += 1;
		}

		this.velocity[0] += acceleration[0] * delta * 240;
		this.velocity[1] += acceleration[1] * delta * 240;

		super.update(delta);

		const forward = [
			this.game.mousePosition[0] - this.position[0],
			this.game.mousePosition[1] - this.position[1],
		];

		{
			const len = Math.sqrt(forward[0] * forward[0] + forward[1] * forward[1]);
			if (len === 0) {
				forward[0] = 1;
				forward[1] = 0;
			} else {
				forward[0] /= len;
				forward[1] /= len;
			}
		}

		this.forward = forward;

		if (this.weapon !== null) {
			this.grabbing = null;
			this.hover = null;

			this.weapon.heldUpdate(delta, this);

			if (this.weapon.empty) {
				this.weapon = null;
			}

			return;
		} else if (this.grabbing !== null) {
			const holdDistance = 1 + this.grabbing.radius + 0.5;

			const targetPosition = [
				this.position[0] + forward[0] * holdDistance,
				this.position[1] + forward[1] * holdDistance,
			];

			this.grabbing.velocity[0] += (targetPosition[0] - this.grabbing.position[0]) * delta * 600.0;
			this.grabbing.velocity[1] += (targetPosition[1] - this.grabbing.position[1]) * delta * 600.0;

			this.grabbing.velocity[0] += this.velocity[0] * delta * 10;
			this.grabbing.velocity[1] += this.velocity[1] * delta * 10;

			this.grabbing.velocity[0] *= Math.pow(0.5, delta * 40.0);
			this.grabbing.velocity[1] *= Math.pow(0.5, delta * 40.0);

			this.hover = null;

			if (actionsJustPressed.attack) {
				this.grabbing.velocity[0] = forward[0] * 50;
				this.grabbing.velocity[1] = forward[1] * 50;

				this.grabbing = null;
			}
		} else {
			const intersections = this.game.traceRay(this.position, forward, 0.2);

			const hoverEntAndDistance = intersections.find((entAndDistance) => {
				return entAndDistance[0] < 5 && entAndDistance[1].isEnemy;
			});

			if (hoverEntAndDistance !== undefined) {
				this.hover = hoverEntAndDistance[1];
			} else {
				this.hover = null;
			}

			if (actionsJustPressed.attack && this.hover !== null) {
				this.grabbing = this.hover;
				this.hover = null;

				this.grabbing.concussed = true;
			}
		}
	}
}

class Swordsman extends Entity {
	constructor(game) {
		super(game);

		this.radius = 1.5;
		this.drawRadius = 1;

		this.attackTimer = -999;

		this.isEnemy = true;

		this.PROP_attackWhole = 0.7;
		this.PROP_attackDmg = 0.2;
		this.PROP_attackRe = 1;

		this.PROP_attackEngageRadius = 4;
		this.PROP_attackRadius = 5;

		this.fast = Math.random() < 0.2;
	}

	activateReaperMode() {
		this.game.effects.push(effect_pop(this));
	}

	update(delta) {
		if (this.concussed) {
			super.update(delta);

			return;
		}

		this.velocity[0] *= Math.pow(0.5, delta * 20.0);
		this.velocity[1] *= Math.pow(0.5, delta * 20.0);

		const direction = [
			this.game.player.position[0] - this.position[0],
			this.game.player.position[1] - this.position[1],
		];

		const len = Math.sqrt(
			direction[0] * direction[0] +
			direction[1] * direction[1]
		);

		if (len > 1) {
			direction[0] /= len;
			direction[1] /= len;
		}

		if (len < this.PROP_attackEngageRadius && this.attackTimer < -this.PROP_attackRe) {
			this.attackTimer = this.PROP_attackWhole;
		}

		const wasAbove = this.attackTimer > this.PROP_attackDmg;

		this.attackTimer -= delta;

		if (!(this.attackTimer > this.PROP_attackDmg) && wasAbove) {
			if (len < this.PROP_attackRadius) {
				this.game.player.damage(1);
			}
		}

		let speed = 70;
		if (this.fast) {
			speed *= 2;
		}

		if (this.attackTimer < 0) {
			this.velocity[0] += direction[0] * delta * speed;
			this.velocity[1] += direction[1] * delta * speed;
		}

		super.update(delta);
	}

	draw() {
		super.draw();

		if (this.fast) {
			ctx.fillStyle = "#FFFF44";
		} else {
			ctx.fillStyle = "#FF6622";
		}

		ctx.beginPath();
		ctx.arc(this.position[0] * UNIT, this.position[1] * UNIT, this.drawRadius * UNIT, 0, Math.PI * 2);

		ctx.fill();
	}

	drawPost() {
		if (!this.concussed) {
			const angle = Math.atan2(this.game.player.position[1] - this.position[1],
									 this.game.player.position[0] - this.position[0]);

			ctx.save();
			ctx.translate(this.position[0] * UNIT, this.position[1] * UNIT);
			ctx.rotate(angle);

			let x = 0;
			if (this.attackTimer > this.PROP_attackDmg && this.attackTimer < this.PROP_attackWhole) {
				const ratio = (this.attackTimer - this.PROP_attackDmg) / (this.PROP_attackWhole - this.PROP_attackDmg);

				x -= Math.pow(1 - ratio, 0.5) * 40;
			}

			ctx.translate(x, 0);

			ctx.scale(2, 2);

			ctx.strokeStyle = "#000";
			ctx.stroke(paths.sword);

			ctx.fillStyle = "#DEF";
			ctx.fill(paths.sword);

			if (this.attackTimer > this.PROP_attackDmg && this.attackTimer < this.PROP_attackWhole) {
				const ratio = (this.attackTimer - this.PROP_attackDmg) / (this.PROP_attackWhole - this.PROP_attackDmg);

				const a = (1 - ratio);

				ctx.lineWidth = 20 * (1 - ratio);
				ctx.strokeStyle = "rgba(255, 0, 0, " + a + ")";
				ctx.stroke(paths.sword);
			}

			if (this.attackTimer > 0 && this.attackTimer < this.PROP_attackDmg) {
				const ratio = (this.attackTimer / this.PROP_attackDmg);

				const a = ratio;

				ctx.lineWidth = 40 * ratio;
				ctx.strokeStyle = "rgba(255, 255, 255, " + a + ")";
				ctx.stroke(paths.sword);
			}

			ctx.restore();
		}
	}
}

class Sniper extends Entity {
	constructor(game) {
		super(game);

		this.radius = 1;
		this.drawRadius = 0.5;

		this.attackTimer = 0;

		this.isEnemy = true;

		this.PROP_attackWhole = 1;
		this.PROP_attackRe = 4;

		this.forward = [0, 0];
	}

	activateReaperMode() {
		this.game.effects.push(effect_pop(this));
	}

	update(delta) {
		if (this.concussed) {
			super.update(delta);

			return;
		}

		this.velocity[0] *= Math.pow(0.5, delta * 20.0);
		this.velocity[1] *= Math.pow(0.5, delta * 20.0);

		const direction = [
			this.game.player.position[0] - this.position[0],
			this.game.player.position[1] - this.position[1],
		];

		const len = Math.sqrt(
			direction[0] * direction[0] +
			direction[1] * direction[1]
		);

		if (len > 0.0) {
			direction[0] /= len;
			direction[1] /= len;
		} else {
			direction[0] = 1;
		}

		if (this.attackTimer < 0) {
			this.forward = [direction[0], direction[1]];
		}

		if (this.attackTimer < -this.PROP_attackRe && len < 10) {
			this.attackTimer = this.PROP_attackWhole;
		}

		const wasAbove = this.attackTimer > 0.0;

		this.attackTimer -= delta;

		if (!(this.attackTimer > 0.0) && wasAbove) {
			playSound("sniper-attack");

			for (const entity of this.game.traceRay(this.position, this.forward, 0.0)) {
				if (entity[1] === this.game.player) {
					this.game.player.damage(1);
				}
			}
		}

		if (this.attackTimer < 0) {
			this.velocity[0] += direction[0] * delta * 70;
			this.velocity[1] += direction[1] * delta * 70;
		}

		super.update(delta);
	}

	draw() {
		super.draw();

		ctx.fillStyle = "#FF6622";

		ctx.beginPath();
		ctx.arc(this.position[0] * UNIT, this.position[1] * UNIT, this.drawRadius * UNIT, 0, Math.PI * 2);

		ctx.fill();
	}

	drawPre() {
		if (!this.concussed && this.attackTimer > 0.0) {
			ctx.save();

			ctx.strokeStyle = "#F44";
			ctx.lineWidth = Math.pow(1 - this.attackTimer, 3) * 8;

			ctx.beginPath();
			ctx.moveTo(this.position[0] * UNIT, this.position[1] * UNIT);
			ctx.lineTo(
				this.position[0] * UNIT + this.forward[0] * 4000,
				this.position[1] * UNIT + this.forward[1] * 4000,
			);
			ctx.stroke();

			ctx.restore();
		}

		super.drawPre();
	}
}

class Sacrifice extends Entity {
	constructor(game) {
		super(game);

		this.radius = 5;
		this.bump = false;

		this.timer = 10;

		this.enemiesWithin = 0;
		this.target = 4;

		this.item = Math.random() < 0.33333 ? "railgun" : Math.random() < 0.5 ? "shotgun" : "rocket";

		this.success = false;
	}

	collide(delta, other) {
		if (other.isEnemy && !other.concussed) {
			other.velocity[0] += (other.position[0] - this.position[0]) * delta * 10.0;
			other.velocity[1] += (other.position[1] - this.position[1]) * delta * 10.0;
		}

		if (other.isEnemy && other.concussed && !other.grabbed()) {
			other.velocity[0] *= Math.pow(0.5, delta * 15.0);
			other.velocity[1] *= Math.pow(0.5, delta * 15.0);
		}

		super.collide(delta, other);
	}

	update(delta) {
		this.timer -= delta;

		if (this.timer < 0.0) {
			this.dead = true;

			{
				let time = 1;

				const x = this.position[0] * UNIT, y = this.position[1] * UNIT;

				const radius = this.radius * UNIT;

				this.game.effects.push((delta) => {
					time -= delta * 3;

					const size = radius * Math.pow(time, 0.5);

					ctx.save();
					ctx.translate(x, y);

					ctx.strokeStyle = "#F44";
					ctx.lineWidth = Math.pow(time, 1.5) * 50;

					ctx.shadowColor = "#E00";
					ctx.shadowBlur = 20;

					ctx.beginPath();
					ctx.arc(0, 0, size, 0, Math.PI * 2);
					ctx.stroke();

					ctx.restore();

					return time > 0;
				});
			}

			if (this.success) {
				const pickup = new WeaponPickup(this.game, this.item);
				pickup.position = this.position;
				this.game.entities.push(pickup);

				this.game.spawnSacrifice();
			} else if (!this.game.over) {
				this.game.over = true;
				this.game.overMessage = "Sacrifice FAILED";
			}
		}

		this.enemiesWithin = 0;

		for (const entity of this.game.entities) {
			if (entity.isEnemy && distance(entity.position, this.position) < (this.radius + entity.radius * 0.5)) {
				if (this.dead) {
					entity.dead = true;
				}
				this.enemiesWithin++;
			}
		}

		if (this.enemiesWithin >= this.target && this.timer < 0.5) {
			this.success = true;
		}
	}

	drawShadow() {
	}

	drawPost() {
		super.drawPost();

		ctx.save();

		ctx.translate(this.position[0] * UNIT, this.position[1] * UNIT);

		if (this.success || (this.enemiesWithin >= this.target)) {
			ctx.strokeStyle = "#4F4";

			ctx.shadowColor = "#0F0";
		} else {
			ctx.strokeStyle = "#F44";

			ctx.shadowColor = "#F00";
		}
		ctx.lineWidth = 8;
		ctx.shadowBlur = 8;

		ctx.beginPath();
		ctx.arc(0, 0, this.radius * UNIT, 0, Math.PI * 2);
		ctx.stroke();

		ctx.shadowBlur = 0;

		ctx.save();
		ctx.rotate(Math.PI * 0.25);

		for (let i = 0; i < 5; i++) {
			let offset = (i + (this.game.time * 2.5) % 1.0) / 5;
			offset = offset * 2 - 1;

			const offsetAbs = Math.abs(offset);

			const x = offset * this.radius * UNIT;
			const y = this.radius * UNIT * Math.sqrt(1 - (offsetAbs * offsetAbs));

			ctx.beginPath();
			ctx.moveTo(x, -y);
			ctx.lineTo(x, y);
			ctx.stroke();
		}

		ctx.restore();

		ctx.font = "normal 900 40px Saira";

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 4;

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#F44";
		ctx.strokeText(this.timer.toFixed(2), 0, (-this.radius - 1) * UNIT);
		ctx.fillText(this.timer.toFixed(2), 0, (-this.radius - 1) * UNIT);

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 4;

		ctx.fillStyle = this.enemiesWithin >= this.target ? "#4F4" : "#F44";
		ctx.strokeText(this.enemiesWithin + "/" + this.target, 0, -UNIT * 1.8);
		ctx.fillText(this.enemiesWithin + "/" + this.target, 0, -UNIT * 1.8);

		ctx.save();
		ctx.scale(2, 2);
		ctx.translate(-24, -24);
		ctx.shadowColor = items[this.item].fgBlur;
		ctx.shadowBlur = 8;
		ctx.fillStyle = items[this.item].fg;
		ctx.fill(items[this.item].icon);
		ctx.restore();

		ctx.restore();
	}
}

class Game {
	constructor() {
		this.entities = [new Player(this), new WeaponPickup(this, "shotgun")];
		this.arenaWidth = 80;
		this.arenaHeight = 40;

		this.over = false;
		this.overMessage = null;

		this.player = this.entities[0];

		this.camera = [0, 0];

		this.effects = [];

		this.time = 0;

		this.mousePosition = [0, 0];

		this.enemyTimer = 0;

		this.nextSacrifice = this.randomPosition();
		this.spawnSacrifice();

		this.score = 0;

		this.Zoom = 1;
	}

	/// `direction` must be normalized!
	traceRay(start, direction, slop) {
		let intersections = [];

		let aside = [direction[1], -direction[0]];

		const startAhead = start[0] * direction[0] + start[1] * direction[1];
		const startAside = start[0] * aside[0] + start[1] * aside[1];

		for (const entity of this.entities) {
			let distanceAhead =
				direction[0] * entity.position[0] +
				direction[1] * entity.position[1]
				- entity.radius
				- startAhead;
			let distanceAside =
				aside[0] * entity.position[0] +
				aside[1] * entity.position[1]
				- startAside;

			if (distanceAhead < -entity.radius) {
				continue;
			}

			if (Math.abs(distanceAside) > entity.radius + slop) {
				continue;
			}

			intersections.push([distanceAhead, entity]);
		}

		intersections.sort((a, b) => a[0] - b[0]);

		return intersections;
	}

	update(delta) {
		const targetZoom = ScaleFactor;
		this.Zoom = targetZoom;

		this.mousePosition = [
			((mousePosition[0] - (canvas.width * 0.5)) / UNIT / this.Zoom) + this.camera[0],
			 ((mousePosition[1] - (canvas.height * 0.5)) / UNIT / this.Zoom) + this.camera[1],
		];

		this.time = (this.time + delta) % 100;

		for (let i = 0; i < this.entities.length; i++) {
			for (let j = i + 1; j < this.entities.length; j++) {
				this.entities[i].checkCollision(delta, this.entities[j]);
				this.entities[j].checkCollision(delta, this.entities[i]);
			}
		}

		for (let i = 0; i < this.entities.length; i++) {
			const entity = this.entities[i];

			entity.update(delta);
			if (entity.dead) {
				entity.activateReaperMode();
				this.entities.splice(i, 1);
				i--;
			}
		}

		this.camera[0] += (this.player.position[0] - this.camera[0]) * (1.0 - Math.pow(0.5, delta * 5.0));
		this.camera[1] += (this.player.position[1] - this.camera[1]) * (1.0 - Math.pow(0.5, delta * 5.0));

		if (this.enemyTimer < 0 && this.entities.length < 40) {
			this.enemyTimer = Math.random() * 2.5 + 1.8;

			const pos = this.randomPosition();

			const waveSize = Math.random() * 4 + 4;

			for (let i = 0; i < waveSize; i++) {

				const enemy = Math.random() < 0.7 ? new Swordsman(this) : new Sniper(this);
				enemy.position = [pos[0] + Math.random() * 0.1, pos[1] + Math.random() * 0.1];

				this.entities.push(enemy);
			}
		}

		this.enemyTimer -= delta;

		if (this.player.dead) {
			if (!this.over) {
				this.over = true;
				this.overMessage = "You Died";
			}
		}
	}

	randomPosition() {
		return [Math.random() * this.arenaWidth - (this.arenaWidth / 2), Math.random() * this.arenaHeight - (this.arenaHeight / 2)];
	}

	spawnSacrifice() {
		const sacrifice = new Sacrifice(this)
		sacrifice.position = this.nextSacrifice;
		this.entities.push(sacrifice);

		this.nextSacrifice = this.randomPosition();

		{
			let time = 0;
			this.effects.push((delta) => {
				time += delta;

				const size = Math.pow((time / 10), 4) * (4.8 * UNIT) + 0.2 * UNIT;

				ctx.save();
				ctx.strokeStyle = "#F44";
				ctx.shadowColor = "#F00";
				ctx.shadowBlur = 16;

				ctx.lineWidth = 10;

				ctx.beginPath();

				ctx.arc(this.nextSacrifice[0] * UNIT, this.nextSacrifice[1] * UNIT, size, 0, Math.PI * 2);

				ctx.stroke();
				ctx.restore();

				return time < 10;
			});
		}
	}

	draw(delta) {
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.save();

		ctx.translate(canvas.width * 0.5, canvas.height * 0.5);

		ctx.scale(this.Zoom, this.Zoom);

		ctx.save();
		ctx.scale(0.96, 0.96);

		ctx.translate(-this.camera[0] * UNIT, -this.camera[1] * UNIT);

		ctx.fillStyle = "#407050";
		ctx.fillRect(-this.arenaWidth / 2 * UNIT, -this.arenaHeight / 2 * UNIT, this.arenaWidth * UNIT, this.arenaHeight * UNIT);

		for (const entity of this.entities) {
			entity.drawShadow();
		}
		ctx.restore();

		ctx.translate(-this.camera[0] * UNIT, -this.camera[1] * UNIT);

		for (const entity of this.entities) {
			entity.drawPre();
		}

		for (const entity of this.entities) {
			entity.draw();
		}

		for (const entity of this.entities) {
			entity.drawPost();
		}

		for (let i = 0; i < this.effects.length; i++) {
			if (!this.effects[i](delta)) {
				this.effects.splice(i, 1);
				i--;
			}
		}

		ctx.restore();

		this.player.drawHud(delta);
	}
}

let game = null;

let previousTime = null;

function tick(time) {
	let delta = (time - (previousTime ?? time)) / 1000;
	previousTime = time;

	if (delta > 0.1) {
		delta = 0.1;
	}

	requestAnimationFrame(tick);

	if (game === null) {
		ctx.fillStyle = '#407050';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		return;
	}

	if (game.over) {
		setMenuShown(true);
	}

	if (menuVisible && !game.over) {
		delta = 0;
	} else if (game.over) {
		delta *= 0.05;
		game.update(delta);
	} else {
		game.update(delta);
	}

	game.draw(delta);

	actionsJustPressed = {};
}

requestAnimationFrame(tick);

window.onresize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	ScaleFactor = canvas.width / 1920;
};

window.onresize();

let menuVisible = false;

function isMenuShown() {
	return menuVisible;
}

function setMenuShown(shown) {
	if (shown === menuVisible) {
		return;
	}

	if (!shown) {
		if (game === null) {
			return;
		}

		if (game.over) {
			return;
		}
	}

	const menu = document.querySelector("#menu");

	if (shown) {
		menu.classList.add("menu--visible");
	} else {
		menu.classList.remove("menu--visible");
	}

	menuVisible = shown;

	if (document.activeElement !== null) {
		document.activeElement.blur();
	}

	if (!shown) {
		return;
	}

	if (game && game.over) {
		document.querySelector("#menu__death").textContent = game.overMessage;
	} else {
		document.querySelector("#menu__death").textContent = "";
	}

	const buttons = [];

	if (game === null) {
		buttons.push({
			text: "Play",
			style: "primary",

			callback() {
				game = new Game();
				setMenuShown(false);
			},
		});
	} else if (game.over) {
		buttons.push({
			text: "New Game",
			style: "primary",

			callback() {
				game = new Game();
				setMenuShown(false);
			},
		});
	} else {
		buttons.push({
			text: "Resume",
			style: "primary",

			callback() {
				setMenuShown(false);
			},
		});

		buttons.push({
			text: "New Game",
			style: "danger",

			callback() {
				game = new Game();

				setMenuShown(false);
			},
		});
	}

	const buttonsSeparator = document.querySelector("#buttons-sentinel");

	while (buttonsSeparator.nextSibling !== null) {
		buttonsSeparator.nextSibling.remove();
	}

	for (const button of buttons) {
		const buttonElement = document.createElement("button");

		buttonElement.textContent = button.text;
		buttonElement.className = "menu__button menu__button--" + button.style;

		buttonElement.addEventListener("click", () => {
			button.callback();
		});

		buttonsSeparator.parentNode.appendChild(buttonElement);
	}
}

const bindings = {
	up: 69, // E
	down: 68, // D
	left: 83, // S
	right: 70, // F
};

function actionDown(name) {
	actionsPressed[name] = true;
	actionsJustPressed[name] = true;
}

function actionUp(name) {
	delete actionsPressed[name];
}

let currentRebindButton = null;

function keyName(keyCode) {
	if (
		(keyCode >= "A".charCodeAt(0) && keyCode <= "Z".charCodeAt(0)) ||
		(keyCode >= "0".charCodeAt(0) && keyCode <= "9".charCodeAt(0))
	) {
		return String.fromCharCode(keyCode);
	}

	return {
		9: "Tab",

		13: "Return",

		16: "Shift",

		32: "␣",

		37: "Left Arrow",
		39: "Right Arrow",
		38: "Up Arrow",
		40: "Down Arrow",

		96: "Numpad 0",
		97: "Numpad 1",
		98: "Numpad 2",
		99: "Numpad 3",
		100: "Numpad 4",
		101: "Numpad 5",
		102: "Numpad 6",
		103: "Numpad 7",
		104: "Numpad 8",
		105: "Numpad 9",
		106: "Numpad *",
		107: "Numpad +",
		109: "Numpad -",
		110: "Numpad .",
		111: "Numpad /",
	}[keyCode] ?? "KC" + keyCode;
}

for (const action in bindings) {
	const button = document.createElement("button");
	button.dataset.action = action;

	button.className = "menu__bind";

	button.addEventListener("click", () => {
		button.textContent = "";
		currentRebindButton = button;
	});

	const onBlur = () => {
		button.textContent = keyName(bindings[button.dataset.action]);
	};

	button.addEventListener("blur", onBlur);

	onBlur();

	const row = document.createElement("div");
	row.className = "menu__binding-row";

	const label = document.createElement("span");
	label.textContent = {
		up: "Up",
		down: "Down",
		left: "Left",
		right: "Right",
	}[action];

	label.className = "menu__binding-label";

	row.appendChild(label);
	row.appendChild(button);

	document.querySelector(".menu__bindings").appendChild(row);
}

const keys = [];

window.onkeydown = (e) => {
	if (e.ctrlKey) {
		return;
	}

	if (e.which == 27) {
		if (currentRebindButton !== null) {
			currentRebindButton.blur();
			currentRebindButton = null;
			return;
		}

		e.preventDefault();

		setMenuShown(!isMenuShown());

		return;
	}

	if (currentRebindButton !== null) {
		if (document.activeElement === currentRebindButton) {
			bindings[currentRebindButton.dataset.action] = e.which;

			currentRebindButton.blur();

			e.preventDefault();
		}

		currentRebindButton = null;
		return;
	}

	for (const action in bindings) {
		if (bindings[action] == e.which) {
			actionDown(action);
			e.preventDefault();
		}
	}
};

window.onkeyup = (e) => {
	for (const action in bindings) {
		if (bindings[action] == e.which) {
			actionUp(action);
			e.preventDefault();
		}
	}

	if (e.which == 27) {
		e.preventDefault();
	}
};

canvas.addEventListener("mousemove", (e) => {
	mousePosition = [e.offsetX, e.offsetY];
});

window.onmousedown = (e) => {
	if (!audioCtx) {
		audioCtx = new AudioContext({latencyHint: "interactive"});
		initAudio();
	}
};

canvas.onmousedown = (e) => {
	if (e.button === 0) {
		actionDown("attack");
	}
};

canvas.onmouseup = (e) => {
	if (e.button === 0) {
		actionUp("attack");
	}
};

window.onblur = () => {
	for (const action in actionsPressed) {
		actionUp(action);
	}

	setMenuShown(true);
};

setMenuShown(true);
