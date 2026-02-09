"use strict";

// ========================================
// キャンバスとコンテキストの初期化
// ========================================
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// ========================================
// ゲーム定数の定義
// ========================================
const BOX_SIZE = 150; // 戦闘エリアのサイズ
const BOX_X = canvas.width / 2 - BOX_SIZE / 2;
const BOX_Y = canvas.height / 2 - BOX_SIZE / 2;
const HEART_SIZE = 20; // ハートのサイズ
const SHIELD_WIDTH = 50; // 盾の幅（横棒）
const SHIELD_HEIGHT = 10; // 盾の高さ（横棒）
const ARROW_SIZE = 30; // 矢印のサイズ
const ARROW_SPEED = 3; // 矢印の速度
const SHIELD_SPEED = 5; // 盾の移動速度
const ARROW_COUNT = 20; // 矢印の総数
const CLOSEST_THRESHOLD = 80; // 一番近いと判定する距離

// ========================================
// ゲーム状態の管理
// ========================================
let heart = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

let shield = {
    x: canvas.width / 2,
    y: canvas.height / 2 - 80,
    vx: 0,
    vy: 0
};

let arrows = [];
let arrowsSpawned = 0;
let spawnTimer = 0;

// キー入力の状態
let keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// ========================================
// 画像リソースの読み込み
// ========================================
const images = {
    arrow1: new Image(),    // 左から
    arrow2: new Image(),    // 下から
    arrow3: new Image(),    // 右から
    arrow4: new Image(),    // 上から
    arrow01: new Image(),   // 左から（近い）
    arrow02: new Image(),   // 下から（近い）
    arrow03: new Image(),   // 右から（近い）
    arrow04: new Image()    // 上から（近い）
};

images.arrow1.src = '../material/undyne/1.png';
images.arrow2.src = '../material/undyne/2.png';
images.arrow3.src = '../material/undyne/3.png';
images.arrow4.src = '../material/undyne/4.png';
images.arrow01.src = '../material/undyne/01.png';
images.arrow02.src = '../material/undyne/02.png';
images.arrow03.src = '../material/undyne/03.png';
images.arrow04.src = '../material/undyne/04.png';

// ========================================
// キーボード入力の処理
// ========================================
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

// ========================================
// 矢印の生成関数
// ========================================
function createArrow() {
    const direction = Math.floor(Math.random() * 4) + 1; // 1〜4のランダム
    let arrow = {
        direction: direction,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0
    };

    // 方向に応じた初期位置と速度を設定
    switch(direction) {
        case 1: // 左から右へ
            arrow.x = -ARROW_SIZE;
            arrow.y = canvas.height / 2;
            arrow.vx = ARROW_SPEED;
            arrow.vy = 0;
            break;
        case 2: // 下から上へ
            arrow.x = canvas.width / 2;
            arrow.y = canvas.height + ARROW_SIZE;
            arrow.vx = 0;
            arrow.vy = -ARROW_SPEED;
            break;
        case 3: // 右から左へ
            arrow.x = canvas.width + ARROW_SIZE;
            arrow.y = canvas.height / 2;
            arrow.vx = -ARROW_SPEED;
            arrow.vy = 0;
            break;
        case 4: // 上から下へ
            arrow.x = canvas.width / 2;
            arrow.y = -ARROW_SIZE;
            arrow.vx = 0;
            arrow.vy = ARROW_SPEED;
            break;
    }

    arrows.push(arrow);
    arrowsSpawned++;
}

// ========================================
// 距離計算関数（矢印と盾の距離）
// ========================================
function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// ========================================
// 各方向で最も近い矢印を見つける関数
// ========================================
function getClosestArrowByDirection() {
    const closest = {1: null, 2: null, 3: null, 4: null};
    const minDist = {1: Infinity, 2: Infinity, 3: Infinity, 4: Infinity};

    arrows.forEach(arrow => {
        const dist = getDistance(arrow.x, arrow.y, shield.x, shield.y);
        if (dist < minDist[arrow.direction]) {
            minDist[arrow.direction] = dist;
            closest[arrow.direction] = arrow;
        }
    });

    return closest;
}

// ========================================
// 盾の更新処理
// ========================================
function updateShield() {
    // WASDキーに基づいて盾を移動
    shield.vx = 0;
    shield.vy = 0;

    if (keys.w) shield.vy = -SHIELD_SPEED;
    if (keys.s) shield.vy = SHIELD_SPEED;
    if (keys.a) shield.vx = -SHIELD_SPEED;
    if (keys.d) shield.vx = SHIELD_SPEED;

    shield.x += shield.vx;
    shield.y += shield.vy;

    // 戦闘エリアの外側に制限（盾は箱の周りを移動）
    const boxLeft = BOX_X - SHIELD_WIDTH;
    const boxRight = BOX_X + BOX_SIZE + SHIELD_WIDTH;
    const boxTop = BOX_Y - SHIELD_HEIGHT;
    const boxBottom = BOX_Y + BOX_SIZE + SHIELD_HEIGHT;

    if (shield.x < boxLeft) shield.x = boxLeft;
    if (shield.x > boxRight - SHIELD_WIDTH) shield.x = boxRight - SHIELD_WIDTH;
    if (shield.y < boxTop) shield.y = boxTop;
    if (shield.y > boxBottom - SHIELD_HEIGHT) shield.y = boxBottom - SHIELD_HEIGHT;
}

// ========================================
// 矢印の更新処理
// ========================================
function updateArrows() {
    // 各矢印を移動
    arrows.forEach(arrow => {
        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
    });

    // 画面外に出た矢印を削除
    arrows = arrows.filter(arrow => {
        return arrow.x > -ARROW_SIZE * 2 && 
               arrow.x < canvas.width + ARROW_SIZE * 2 &&
               arrow.y > -ARROW_SIZE * 2 && 
               arrow.y < canvas.height + ARROW_SIZE * 2;
    });
}

// ========================================
// 描画処理
// ========================================
function draw() {
    // 背景をクリア
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 戦闘エリア（箱）を描画
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeRect(BOX_X, BOX_Y, BOX_SIZE, BOX_SIZE);

    // ハート（♡）を描画（緑色）
    ctx.fillStyle = '#00ff00';
    ctx.font = `${HEART_SIZE}px Arial`;
    ctx.fillText('♡', heart.x - HEART_SIZE/2, heart.y + HEART_SIZE/2);

    // 各方向で最も近い矢印を特定
    const closestArrows = getClosestArrowByDirection();

    // 矢印を描画
    arrows.forEach(arrow => {
        const isClosest = closestArrows[arrow.direction] === arrow;
        const dist = getDistance(arrow.x, arrow.y, shield.x, shield.y);
        
        // 距離が近い場合は「近い」バージョンの画像を使用
        let img;
        if (isClosest && dist < CLOSEST_THRESHOLD) {
            img = images[`arrow0${arrow.direction}`];
        } else {
            img = images[`arrow${arrow.direction}`];
        }

        ctx.drawImage(img, arrow.x - ARROW_SIZE/2, arrow.y - ARROW_SIZE/2, ARROW_SIZE, ARROW_SIZE);
    });

    // 盾を描画（横の棒）
    ctx.fillStyle = '#00ffff'; // 水色
    ctx.fillRect(shield.x - SHIELD_WIDTH/2, shield.y - SHIELD_HEIGHT/2, SHIELD_WIDTH, SHIELD_HEIGHT);
    ctx.strokeStyle = '#ffffff'; // 白い枠線
    ctx.lineWidth = 2;
    ctx.strokeRect(shield.x - SHIELD_WIDTH/2, shield.y - SHIELD_HEIGHT/2, SHIELD_WIDTH, SHIELD_HEIGHT);

    // デバッグ情報を表示
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Arrows: ${arrows.length}/${ARROW_COUNT}`, 10, 30);
}

// ========================================
// ゲームループ
// ========================================
function gameLoop() {
    // 矢印を定期的に生成（全20個まで）
    if (arrowsSpawned < ARROW_COUNT) {
        spawnTimer++;
        if (spawnTimer >= 60) { // 約1秒ごと（60フレーム）
            createArrow();
            spawnTimer = 0;
        }
    }

    // 更新処理
    updateShield();
    updateArrows();

    // 描画処理
    draw();

    // 次のフレームをリクエスト
    requestAnimationFrame(gameLoop);
}

// ========================================
// ゲーム開始
// ========================================
// 画像がすべて読み込まれるまで待機
let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

Object.values(images).forEach(img => {
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            // すべての画像が読み込まれたらゲーム開始
            gameLoop();
        }
    };
});
