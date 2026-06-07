import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import kaplay from "kaplay";

/**
 * Hidden side-scrolling platformer (a "Mario-kind" of game).
 *
 * Reachable only via the direct /arcade link: it is not linked anywhere in the
 * site nav and is marked noindex so it stays out of search results. This is
 * obscurity, not security: the code ships in a lazy-loaded chunk, so anyone
 * reading the bundle could still find it.
 *
 * Built with Kaplay. The engine owns its own game loop inside the <canvas>;
 * React only mounts it and tears it down (k.quit) on unmount so dev StrictMode
 * double-mounts and route changes don't leak a second running instance.
 *
 * All art is placeholder shapes/colours on purpose, no third-party (Nintendo)
 * sprites or audio.
 */
export default function ArcadePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Shared touch-input flags read by the game loop each frame.
  const input = useRef({ left: false, right: false, jump: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const k = kaplay({
      canvas,
      width: 800,
      height: 450,
      letterbox: true,
      background: [247, 231, 222], // warm pale Japanese-print sky
      global: false,
      pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
    });

    const SPEED = 250;
    const JUMP_FORCE = 800;
    const GROUND_Y = 410;
    const LEVEL_END = 8450;

    k.setGravity(2050);

    // Player samurai sprite (big-face chibi: drawn armor + katana + real face).
    // Source art is 167x214 (ratio ~0.78); keep that ratio in-game.
    k.loadSprite("hero", "/arcade/hero.png");
    const HERO_H = 96;
    const HERO_W = Math.round(HERO_H * 0.78);

    // Enemies: soldier sprites (drawn uniforms + real faces). Each is a friend.
    k.loadSprite("soldier", "/arcade/soldier.png"); // marco, olive combat helmet
    k.loadSprite("soldier2", "/arcade/soldier2.png"); // mads_peter, grey, own cap
    const ENEMY_H = 96;
    const ENEMY_RATIO: Record<string, number> = { soldier: 0.776, soldier2: 0.538 };
    const ENEMY_KINDS = ["soldier", "soldier2"];

    // Ground segments [x, width]; the gaps between them are deadly pits.
    const GROUND: [number, number][] = [
      [0, 700], [820, 600], [1560, 500], [2230, 700], [3090, 500],
      [3780, 800], [4760, 600], [5560, 700], [6420, 900], [7500, 1150],
    ];
    // Floating platforms [x, y, w, h]; the low ones (y~310) bridge wide gaps.
    const FLOATING: [number, number, number, number][] = [
      [300, 300, 120, 22], [560, 240, 110, 22], [1050, 290, 120, 22], [1300, 232, 110, 22],
      [1700, 262, 120, 22], [1900, 200, 100, 22], [2100, 312, 96, 22], [2400, 250, 120, 22],
      [2650, 192, 110, 22], [3250, 270, 120, 22], [3450, 202, 100, 22], [3640, 300, 96, 22],
      [3950, 250, 120, 22], [4200, 192, 110, 22], [4620, 310, 96, 22], [4900, 262, 120, 22],
      [5100, 200, 110, 22], [5420, 300, 96, 22], [5750, 250, 120, 22], [6000, 196, 110, 22],
      [6500, 270, 120, 22], [6800, 202, 110, 22], [7050, 252, 110, 22], [7370, 310, 96, 22],
      [7700, 250, 120, 22], [7950, 196, 110, 22], [8200, 242, 110, 22],
    ];
    const COINS: [number, number][] = [
      [340, 250], [600, 200], [860, 330], [1090, 250], [1340, 192], [1700, 222], [1940, 160],
      [2140, 272], [2440, 210], [2690, 152], [2860, 330], [3290, 230], [3490, 162], [3690, 260],
      [3990, 210], [4240, 152], [4460, 330], [4660, 270], [4940, 222], [5140, 160], [5460, 260],
      [5790, 210], [6040, 156], [6260, 330], [6540, 230], [6840, 162], [7090, 212], [7410, 270],
      [7740, 210], [7990, 156], [8240, 202], [8380, 330],
    ];
    // Enemies [x, speed]; placed on ground segments, patrol +/-70 from spawn.
    const ENEMIES: [number, number][] = [
      [450, 60], [1000, 80], [1250, 110], [1800, 70], [2450, 90], [2700, 120],
      [3350, 80], [4000, 110], [4350, 70], [5050, 100], [5800, 80], [6050, 120],
      [6700, 90], [7000, 110], [7800, 80], [8120, 120],
    ];

    type Mover = { pos: { x: number; y: number } };

    k.scene("game", () => {
      let score = 0;

      // ── Sky gradient (fixed bands, top light -> horizon warm) ──
      const top = [255, 238, 232], bot = [250, 206, 188];
      const BANDS = 9;
      for (let i = 0; i < BANDS; i++) {
        const t = i / (BANDS - 1);
        const c = [0, 1, 2].map((j) => Math.round(top[j] + (bot[j] - top[j]) * t));
        k.add([k.rect(820, 54), k.pos(-10, i * 50 - 4), k.color(c[0], c[1], c[2]), k.fixed(), k.z(-120)]);
      }
      // Rising sun with soft glow.
      ([[122, 0.12], [100, 0.2], [80, 1]] as [number, number][]).forEach(([r, o]) =>
        k.add([k.circle(r), k.pos(632, 120), k.color(240, 156, 124), k.opacity(o), k.fixed(), k.z(-115)]));
      // Mt Fuji: haze, body, snow cap.
      k.add([k.polygon([k.vec2(130, 372), k.vec2(400, 96), k.vec2(680, 372)]), k.pos(0, 0), k.color(150, 166, 196), k.opacity(0.55), k.fixed(), k.z(-112)]);
      k.add([k.polygon([k.vec2(190, 372), k.vec2(400, 110), k.vec2(612, 372)]), k.pos(0, 0), k.color(96, 112, 150), k.fixed(), k.z(-111)]);
      k.add([k.polygon([k.vec2(348, 186), k.vec2(400, 110), k.vec2(452, 186), k.vec2(430, 200), k.vec2(410, 184), k.vec2(396, 198), k.vec2(382, 184), k.vec2(364, 200)]), k.pos(0, 0), k.color(248, 250, 255), k.fixed(), k.z(-110)]);
      // Distant hills (two layers).
      k.add([k.polygon([k.vec2(-40, 372), k.vec2(170, 304), k.vec2(390, 372)]), k.pos(0, 0), k.color(154, 178, 152), k.fixed(), k.z(-108)]);
      k.add([k.polygon([k.vec2(300, 372), k.vec2(540, 312), k.vec2(800, 372)]), k.pos(0, 0), k.color(154, 178, 152), k.fixed(), k.z(-108)]);
      k.add([k.polygon([k.vec2(120, 372), k.vec2(380, 326), k.vec2(660, 372)]), k.pos(0, 0), k.color(122, 154, 126), k.fixed(), k.z(-106)]);

      // Drifting clouds.
      const addCloud = (x: number, y: number, s: number, spd: number) => {
        const c = k.add([k.circle(26), k.scale(s * 2.4, s), k.pos(x, y), k.color(255, 255, 255), k.opacity(0.85), k.anchor("center"), k.fixed(), k.z(-109), { spd }]);
        c.onUpdate(() => { c.pos.x -= c.spd * k.dt(); if (c.pos.x < -170) c.pos.x = 970; });
      };
      addCloud(150, 70, 1, 12); addCloud(450, 46, 0.8, 8);
      addCloud(700, 92, 1.2, 16); addCloud(300, 120, 0.7, 10);

      // Cherry-blossom trees along the level.
      const addTree = (x: number) => {
        k.add([k.rect(16, 72), k.pos(x, GROUND_Y), k.anchor("bot"), k.color(96, 64, 48), k.z(-20)]);
        const cx = x + 8, cy = GROUND_Y - 84;
        const blobs: [number, number, number][] = [[-26, 6, 26], [24, 6, 26], [-6, 0, 32], [-30, -16, 22], [22, -16, 22], [-4, -30, 26]];
        for (const [dx, dy, r] of blobs)
          k.add([k.circle(r), k.pos(cx + dx, cy + dy), k.anchor("center"), k.color(247, 193, 212), k.z(-20)]);
      };
      [200, 1000, 1700, 2400, 2800, 3300, 4000, 4800, 5700, 6500, 7200, 7900, 8320].forEach(addTree);

      // Falling petals.
      const petalTimer = k.add([{ t: 0 }]);
      petalTimer.onUpdate(() => {
        petalTimer.t += k.dt();
        if (petalTimer.t < 0.22) return;
        petalTimer.t = 0;
        const cam = k.getCamPos();
        const p = k.add([k.circle(4), k.pos(cam.x + k.rand(-440, 440), -20), k.color(250, 205, 220), k.opacity(0.9), k.anchor("center"), k.z(60), { vy: k.rand(45, 90), ph: k.rand(0, 6.28) }]);
        p.onUpdate(() => { p.move(Math.sin(k.time() * 2 + p.ph) * 32, p.vy); if (p.pos.y > 480) k.destroy(p); });
      });

      // Grass-topped dirt platforms.
      const addPlatform = (x: number, y: number, w: number, h: number) => {
        k.add([k.rect(w, h), k.pos(x, y), k.area(), k.body({ isStatic: true }), k.color(150, 108, 74), k.outline(3, k.rgb(94, 64, 44)), k.z(0), "platform"]);
        k.add([k.rect(w, 11), k.pos(x, y), k.color(112, 182, 92), k.z(1)]);
        k.add([k.rect(w, 4), k.pos(x, y + 11), k.color(78, 148, 74), k.z(1)]);
        for (let gx = x + 6; gx < x + w - 6; gx += 22)
          k.add([k.rect(4, 5), k.pos(gx, y - 4), k.color(120, 190, 96), k.z(1)]);
      };
      GROUND.forEach(([x, w]) => addPlatform(x, GROUND_Y, w, 60));
      FLOATING.forEach(([x, y, w, h]) => addPlatform(x, y, w, h));

      // Soft shadow that tracks a character's feet.
      const addShadow = (owner: Mover, w: number) => {
        const sh = k.add([k.circle(10), k.scale(w / 22, 0.5), k.pos(0, 0), k.color(0, 0, 0), k.opacity(0.18), k.anchor("center"), k.z(2)]);
        sh.onUpdate(() => { sh.pos.x = owner.pos.x; sh.pos.y = owner.pos.y - 3; });
      };

      // Spinning coins.
      for (const [x, y] of COINS) {
        const c = k.add([k.circle(11), k.pos(x, y), k.area(), k.color(255, 214, 0), k.outline(3, k.rgb(206, 150, 30)), k.anchor("center"), k.scale(1, 1), k.z(5), { ph: k.rand(0, 6.28) }, "coin"]);
        c.onUpdate(() => { c.scale.x = Math.abs(Math.cos(k.time() * 3 + c.ph)) * 0.85 + 0.15; });
      }

      // Collision box covers the lower body only, so the big head doesn't snag
      // on platforms overhead. Tall enough that stomping from above still hits.
      const ENEMY_BODY = Math.round(ENEMY_H * 0.72);
      ENEMIES.forEach(([x, spd], i) => {
        const kind = ENEMY_KINDS[i % ENEMY_KINDS.length];
        const ew = Math.round(ENEMY_H * ENEMY_RATIO[kind]);
        const e = k.add([
          k.sprite(kind, { width: ew, height: ENEMY_H }),
          k.pos(x, GROUND_Y),
          k.area({ shape: new k.Rect(k.vec2(0, 0), ew, ENEMY_BODY) }),
          k.body(),
          k.anchor("bot"),
          k.z(5),
          { dir: -1, spd },
          "enemy",
        ]);
        addShadow(e, ew);
        e.onUpdate(() => {
          e.move(e.spd * e.dir, 0);
          if (e.pos.x < x - 70) e.dir = 1;
          if (e.pos.x > x + 70) e.dir = -1;
          e.flipX = e.dir < 0;
        });
      });

      // Goal: a three-tier pagoda.
      const addPagoda = (x: number) => {
        const RED = k.rgb(196, 60, 46), WALL = k.rgb(238, 228, 210), INK = k.rgb(70, 50, 40);
        const roof = (cy: number, w: number) =>
          k.add([k.polygon([k.vec2(-w / 2, 0), k.vec2(w / 2, 0), k.vec2(w / 2 - 14, -22), k.vec2(-w / 2 + 14, -22)]), k.pos(x, cy), k.color(RED), k.outline(2, INK), k.z(-2)]);
        k.add([k.rect(74, 50), k.pos(x, GROUND_Y), k.anchor("bot"), k.color(WALL), k.outline(2, INK), k.z(-3)]);
        roof(GROUND_Y - 50, 108);
        k.add([k.rect(58, 38), k.pos(x, GROUND_Y - 56), k.anchor("bot"), k.color(WALL), k.outline(2, INK), k.z(-3)]);
        roof(GROUND_Y - 94, 84);
        k.add([k.rect(42, 32), k.pos(x, GROUND_Y - 100), k.anchor("bot"), k.color(WALL), k.outline(2, INK), k.z(-3)]);
        roof(GROUND_Y - 132, 62);
        k.add([k.rect(7, 18), k.pos(x, GROUND_Y - 132), k.anchor("bot"), k.color(226, 184, 68), k.z(-2)]);
        k.add([k.rect(64, 210), k.pos(x, GROUND_Y), k.area(), k.anchor("bot"), k.opacity(0), "goal"]);
      };
      addPagoda(LEVEL_END);

      const HERO_BODY = Math.round(HERO_H * 0.72);
      const player = k.add([
        k.sprite("hero", { width: HERO_W, height: HERO_H }),
        k.pos(60, GROUND_Y - 40),
        k.area({ shape: new k.Rect(k.vec2(0, 0), HERO_W, HERO_BODY) }),
        k.body(),
        k.anchor("bot"),
        k.z(6),
        "player",
      ]);
      addShadow(player, HERO_W);

      // HUD.
      const ui = k.add([k.text("Coins: 0", { size: 24 }), k.pos(16, 14), k.fixed(), k.z(100), k.color(60, 40, 30)]);
      const hint = k.add([k.text("Arrows / A,D move   -   Space / Up / tap to jump", { size: 16 }), k.pos(16, 44), k.fixed(), k.z(100), k.color(80, 56, 44)]);
      k.wait(4, () => k.destroy(hint));

      const jump = () => { if (player.isGrounded()) player.jump(JUMP_FORCE); };
      k.onKeyPress("space", jump);
      k.onKeyPress("up", jump);
      k.onKeyPress("w", jump);

      player.onUpdate(() => {
        const left = k.isKeyDown("left") || k.isKeyDown("a") || input.current.left;
        const right = k.isKeyDown("right") || k.isKeyDown("d") || input.current.right;
        if (left) player.move(-SPEED, 0);
        if (right) player.move(SPEED, 0);
        if (input.current.jump) { jump(); input.current.jump = false; }

        const camX = Math.min(Math.max(player.pos.x + 120, k.width() / 2), LEVEL_END - k.width() / 2 + 90);
        k.setCamPos(k.vec2(camX, 225));

        if (player.pos.y > 560) k.go("game"); // fell in a pit
      });

      player.onCollide("coin", (c) => {
        k.destroy(c);
        score += 1;
        ui.text = `Coins: ${score}`;
      });

      player.onCollide("enemy", (e) => {
        // Stomp from above (Mario style) vs. side hit = death.
        if (player.vel.y > 0 && player.pos.y < e.pos.y - ENEMY_H * 0.5) {
          k.destroy(e);
          player.jump(JUMP_FORCE * 0.6);
        } else {
          k.go("game");
        }
      });

      player.onCollide("goal", () => k.go("win", score));
    });

    k.scene("win", (score: number) => {
      k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(247, 231, 222), k.fixed(), k.z(-1)]);
      k.add([
        k.text(`Victory!\n\nCoins collected: ${score}\n\nPress space to play again`, { size: 32, align: "center" }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor("center"),
        k.color(60, 40, 30),
      ]);
      k.onKeyPress("space", () => k.go("game"));
    });

    k.scene("start", () => {
      // Backdrop (sky gradient + sun + Fuji + ground strip).
      const top = [255, 238, 232], bot = [250, 206, 188];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const c = [0, 1, 2].map((j) => Math.round(top[j] + (bot[j] - top[j]) * t));
        k.add([k.rect(820, 54), k.pos(-10, i * 50 - 4), k.color(c[0], c[1], c[2]), k.z(-120)]);
      }
      k.add([k.circle(90), k.pos(632, 120), k.color(240, 156, 124), k.opacity(0.95), k.z(-115)]);
      k.add([k.polygon([k.vec2(150, 372), k.vec2(400, 120), k.vec2(650, 372)]), k.pos(0, 0), k.color(96, 112, 150), k.z(-111)]);
      k.add([k.polygon([k.vec2(360, 196), k.vec2(400, 120), k.vec2(440, 196), k.vec2(424, 208), k.vec2(408, 194), k.vec2(396, 206), k.vec2(384, 194), k.vec2(372, 208)]), k.pos(0, 0), k.color(248, 250, 255), k.z(-110)]);
      k.add([k.rect(820, 70), k.pos(-10, 400), k.color(112, 182, 92), k.z(-50)]);

      // Hero (Samurai Araz).
      const hh = 210, hw = Math.round(hh * 0.78);
      k.add([k.sprite("hero", { width: hw, height: hh }), k.pos(400, 408), k.anchor("bot"), k.z(0)]);

      // Title (drop shadow + main) and tagline.
      k.add([k.text("SAMURAI ARAZ", { size: 54 }), k.pos(403, 73), k.anchor("center"), k.color(60, 30, 24), k.z(5)]);
      k.add([k.text("SAMURAI ARAZ", { size: 54 }), k.pos(400, 70), k.anchor("center"), k.color(214, 68, 52), k.z(6)]);
      k.add([k.text("saves the world against the biggest evil", { size: 22 }), k.pos(400, 116), k.anchor("center"), k.color(70, 48, 38), k.z(6)]);

      // Blinking start prompt.
      const prompt = k.add([k.text("Press SPACE  -  tap to begin", { size: 20 }), k.pos(400, 432), k.anchor("center"), k.color(60, 40, 30), k.opacity(1), k.z(6)]);
      prompt.onUpdate(() => { prompt.opacity = Math.sin(k.time() * 4) * 0.4 + 0.6; });

      // Petals for flavour.
      const pt = k.add([{ t: 0 }]);
      pt.onUpdate(() => {
        pt.t += k.dt();
        if (pt.t < 0.25) return;
        pt.t = 0;
        const p = k.add([k.circle(4), k.pos(k.rand(0, 800), -15), k.color(250, 205, 220), k.opacity(0.9), k.anchor("center"), k.z(10), { vy: k.rand(40, 80), ph: k.rand(0, 6.28) }]);
        p.onUpdate(() => { p.move(Math.sin(k.time() * 2 + p.ph) * 30, p.vy); if (p.pos.y > 470) k.destroy(p); });
      });

      const start = () => { input.current.jump = false; k.go("game"); };
      k.onKeyPress("space", start);
      k.onKeyPress("up", start);
      k.onKeyPress("w", start);
      k.onKeyPress("enter", start);
      k.onMousePress(start);
      k.onUpdate(() => { if (input.current.jump) start(); });
    });

    k.go("start");

    return () => {
      k.quit();
    };
  }, []);

  const leftDown = useCallback(() => { input.current.left = true; }, []);
  const leftUp = useCallback(() => { input.current.left = false; }, []);
  const rightDown = useCallback(() => { input.current.right = true; }, []);
  const rightUp = useCallback(() => { input.current.right = false; }, []);
  const doJump = useCallback(() => { input.current.jump = true; }, []);

  return (
    <>
      <title>Zirium Arcade</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="fixed inset-0 bg-[#0d0d12] flex flex-col items-center justify-center select-none touch-none">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          style={{ imageRendering: "pixelated" }}
        />

        {/* On-screen controls (mobile). Hidden on larger pointers via CSS could be added; kept always-on for simplicity. */}
        <div className="absolute bottom-6 left-6 flex gap-4 sm:hidden">
          <button
            aria-label="Move left"
            className="w-16 h-16 rounded-full bg-white/20 text-white text-3xl active:bg-white/40"
            onTouchStart={leftDown}
            onTouchEnd={leftUp}
            onMouseDown={leftDown}
            onMouseUp={leftUp}
            onMouseLeave={leftUp}
          >
            ◀
          </button>
          <button
            aria-label="Move right"
            className="w-16 h-16 rounded-full bg-white/20 text-white text-3xl active:bg-white/40"
            onTouchStart={rightDown}
            onTouchEnd={rightUp}
            onMouseDown={rightDown}
            onMouseUp={rightUp}
            onMouseLeave={rightUp}
          >
            ▶
          </button>
        </div>
        <div className="absolute bottom-6 right-6 sm:hidden">
          <button
            aria-label="Jump"
            className="w-20 h-20 rounded-full bg-blue-500/60 text-white text-2xl font-bold active:bg-blue-500"
            onTouchStart={doJump}
            onMouseDown={doJump}
          >
            JUMP
          </button>
        </div>

        <Link
          to="/"
          className="absolute top-3 right-4 text-white/70 text-sm hover:text-white"
        >
          ✕ Exit
        </Link>
      </div>
    </>
  );
}
