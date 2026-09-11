export class PlayerController {
  constructor(player, input) {
    this.p = player;
    this.input = input;
    this.facing = { x: 1, y: 0 };
    this.dash = { active: false, t: 0, duration: 120, speed: 980, cooldown: 0, cooldownMax: 320, invuln: 0 };
    this.buffer = { dash: 0, action: 0 };
    this.runSpeed = 250;
    this.sprintSpeed = 345;
    this.accel = 3200;
    this.brake = 4200;
  }

  press(name) {
    if (name === 'dash') this.buffer.dash = 100;
    if (name === 'action') this.buffer.action = 100;
  }

  update(dt) {
    const p = this.p;
    const ms = dt / 1000;
    this.dash.cooldown = Math.max(0, this.dash.cooldown - dt);
    this.dash.invuln = Math.max(0, this.dash.invuln - dt);
    this.buffer.dash = Math.max(0, this.buffer.dash - dt);
    this.buffer.action = Math.max(0, this.buffer.action - dt);

    if (this.dash.active) {
      this.dash.t -= dt;
      p.vx = this.facing.x * this.dash.speed;
      p.vy = this.facing.y * this.dash.speed;
      p.x += p.vx * ms;
      p.y += p.vy * ms;
      if (this.dash.t <= 0) {
        this.dash.active = false;
        this.dash.invuln = 80;
        p.vx = 0;
        p.vy = 0;
      }
      return { moving: true, sprinting: false, dashing: true };
    }

    if (this.buffer.dash > 0 && this.dash.cooldown <= 0 && p.energy >= 24) {
      this.buffer.dash = 0;
      this.dash.active = true;
      this.dash.t = this.dash.duration;
      this.dash.cooldown = this.dash.cooldownMax;
      this.dash.invuln = this.dash.duration + 60;
      p.energy -= 24;
      return { moving: true, sprinting: false, dashing: true };
    }

    const x = (this.input.down('d') ? 1 : 0) - (this.input.down('a') ? 1 : 0);
    const y = (this.input.down('s') ? 1 : 0) - (this.input.down('w') ? 1 : 0);
    const len = Math.hypot(x, y);
    const moving = len > 0;
    const nx = moving ? x / len : 0;
    const ny = moving ? y / len : 0;
    const sprinting = moving && this.input.down('shift') && p.energy > 0;
    const target = sprinting ? this.sprintSpeed : this.runSpeed;

    // Deliberately short acceleration and strong braking: input should feel immediate,
    // not like a character sliding across ice.
    const desiredX = nx * target;
    const desiredY = ny * target;
    const rate = moving ? this.accel : this.brake;
    const step = rate * ms;
    p.vx = approach(p.vx, desiredX, step);
    p.vy = approach(p.vy, desiredY, step);

    if (sprinting) p.energy = Math.max(0, p.energy - 28 * ms);
    else p.energy = Math.min(p.maxEnergy, p.energy + 18 * ms);

    if (moving) {
      this.facing.x = nx;
      this.facing.y = ny;
    }

    p.x += p.vx * ms;
    p.y += p.vy * ms;
    return { moving, sprinting, dashing: false };
  }

  get invulnerable() {
    return this.dash.active || this.dash.invuln > 0;
  }

  get dashReady() {
    return this.dash.cooldown <= 0;
  }
}

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}
