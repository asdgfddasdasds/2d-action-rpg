export class PlayerController {
  constructor(player, input) {
    this.p = player;
    this.input = input;
    this.facing = { x: 1, y: 0 };
    this.lastIntent = { x: 1, y: 0 };
    this.dash = { active: false, t: 0, duration: 112, speed: 1040, cooldown: 300, cooldownMax: 300, invuln: 0 };
    this.buffer = { dash: 0, action: 0 };
    this.runSpeed = 270;
    this.sprintSpeed = 350;
    this.turnSpeed = 99999;
    this.accel = 99999;
    this.brake = 99999;
    this.wasMoving = false;
  }

  press(name) {
    if (name === 'dash') this.buffer.dash = 110;
    if (name === 'action') this.buffer.action = 90;
  }

  consumeAction() {
    if (this.buffer.action <= 0) return false;
    this.buffer.action = 0;
    return true;
  }

  readMove() {
    const right = this.input.down('d') || this.input.down('arrowright');
    const left = this.input.down('a') || this.input.down('arrowleft');
    const down = this.input.down('s') || this.input.down('arrowdown');
    const up = this.input.down('w') || this.input.down('arrowup');

    let x = (right ? 1 : 0) - (left ? 1 : 0);
    let y = (down ? 1 : 0) - (up ? 1 : 0);

    // If opposing keys are held, prefer the most recently pressed intent.
    if (x === 0 && (right || left)) x = this.lastIntent.x;
    if (y === 0 && (down || up)) y = this.lastIntent.y;

    const len = Math.hypot(x, y);
    if (!len) return { moving: false, x: 0, y: 0 };
    x /= len; y /= len;
    this.lastIntent.x = x;
    this.lastIntent.y = y;
    return { moving: true, x, y };
  }

  update(dt) {
    const p = this.p;
    const ms = dt / 1000;
    this.dash.cooldown = Math.max(0, this.dash.cooldown - dt);
    this.dash.invuln = Math.max(0, this.dash.invuln - dt);
    this.buffer.dash = Math.max(0, this.buffer.dash - dt);
    this.buffer.action = Math.max(0, this.buffer.action - dt);

    const intent = this.readMove();

    if (this.dash.active) {
      this.dash.t -= dt;
      p.vx = this.dash.x * this.dash.speed;
      p.vy = this.dash.y * this.dash.speed;
      p.x += p.vx * ms;
      p.y += p.vy * ms;
      if (this.dash.t <= 0) {
        this.dash.active = false;
        this.dash.invuln = 72;
        p.vx = intent.moving ? intent.x * (this.input.down('shift') ? this.sprintSpeed : this.runSpeed) : 0;
        p.vy = intent.moving ? intent.y * (this.input.down('shift') ? this.sprintSpeed : this.runSpeed) : 0;
      }
      return { moving: true, sprinting: false, dashing: true };
    }

    if (this.buffer.dash > 0 && this.dash.cooldown <= 0 && p.energy >= 24) {
      this.buffer.dash = 0;
      const d = intent.moving ? intent : this.lastIntent;
      this.dash.x = d.x;
      this.dash.y = d.y;
      this.facing.x = d.x;
      this.facing.y = d.y;
      this.dash.active = true;
      this.dash.t = this.dash.duration;
      this.dash.cooldown = this.dash.cooldownMax;
      this.dash.invuln = this.dash.duration + 55;
      p.energy -= 24;
      p.vx = this.dash.x * this.dash.speed;
      p.vy = this.dash.y * this.dash.speed;
      return { moving: true, sprinting: false, dashing: true };
    }

    const moving = intent.moving;
    const sprinting = moving && this.input.down('shift') && p.energy > 0;
    const target = sprinting ? this.sprintSpeed : this.runSpeed;

    // Deliberately no travel inertia. The player reaches intended speed immediately
    // and stops immediately, matching the controllable feel of classic precision 2D games.
    p.vx = moving ? intent.x * target : 0;
    p.vy = moving ? intent.y * target : 0;

    if (moving) {
      this.facing.x = intent.x;
      this.facing.y = intent.y;
    }

    if (sprinting) p.energy = Math.max(0, p.energy - 30 * ms);
    else p.energy = Math.min(p.maxEnergy, p.energy + 22 * ms);

    p.x += p.vx * ms;
    p.y += p.vy * ms;
    this.wasMoving = moving;
    return { moving, sprinting, dashing: false };
  }

  get invulnerable() {
    return this.dash.active || this.dash.invuln > 0;
  }

  get dashReady() {
    return this.dash.cooldown <= 0;
  }
}
