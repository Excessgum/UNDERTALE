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
const SHIELD_LENGTH = 60; // 盾の長さ
const SHIELD_THICKNESS = 12; // 盾の厚さ
const ARROW_SIZE = 30; // 矢印のサイズ
const ARROW_SPEED = 3; // 矢印の速度
const ARROW_COUNT = 20; // 矢印の総数
const CLOSEST_THRESHOLD = 80; // 一番近いと判定する距離
const MAX_HP = 56; // 最大HP
const DAMAGE = 7; // 矢印1回のダメージ

// ========================================
// ゲーム状態の管理
// ========================================
let hp = MAX_HP; // 現在のHP

let heart = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

// 盾の方向: 'up', 'left', 'down', 'right'
let shield = {
    direction: 'up', // 初期方向は上
    x: 0,
    y: 0,
    rotation: 0 // 回転角度（ラジアン）
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

// 最後に押されたキー
let lastKeyPressed = 'w';

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
        if (!keys[key]) { // キーが新しく押された時のみ
            keys[key] = true;
            lastKeyPressed = key;
        }
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
        vy: 0,
        hit: false, // 当たり判定フラグ
        blocked: false // 盾でブロックされたか
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
// 盾の更新処理（4方向固定）
// ========================================
function updateShield() {
    // 最後に押されたキーに基づいて盾の方向を決定
    if (lastKeyPressed === 'w') {
        shield.direction = 'up';
        shield.x = BOX_X + BOX_SIZE / 2;
        shield.y = BOX_Y - SHIELD_THICKNESS / 2;
        shield.rotation = 0; // 横棒
    } else if (lastKeyPressed === 'a') {
        shield.direction = 'left';
        shield.x = BOX_X - SHIELD_THICKNESS / 2;
        shield.y = BOX_Y + BOX_SIZE / 2;
        shield.rotation = Math.PI / 2; // 90度回転（縦棒）
    } else if (lastKeyPressed === 's') {
        shield.direction = 'down';
        shield.x = BOX_X + BOX_SIZE / 2;
        shield.y = BOX_Y + BOX_SIZE + SHIELD_THICKNESS / 2;
        shield.rotation = 0; // 横棒
    } else if (lastKeyPressed === 'd') {
        shield.direction = 'right';
        shield.x = BOX_X + BOX_SIZE + SHIELD_THICKNESS / 2;
        shield.y = BOX_Y + BOX_SIZE / 2;
        shield.rotation = Math.PI / 2; // 90度回転（縦棒）
    }
}

// ========================================
// 矢印と盾の当たり判定
// ========================================
function checkArrowShieldCollision(arrow) {
    // 盾の当たり判定範囲を計算
    let shieldLeft, shieldRight, shieldTop, shieldBottom;
    
    if (shield.direction === 'up' || shield.direction === 'down') {
        // 横棒
        shieldLeft = shield.x - SHIELD_LENGTH / 2;
        shieldRight = shield.x + SHIELD_LENGTH / 2;
        shieldTop = shield.y - SHIELD_THICKNESS / 2;
        shieldBottom = shield.y + SHIELD_THICKNESS / 2;
    } else {
        // 縦棒
        shieldLeft = shield.x - SHIELD_THICKNESS / 2;
        shieldRight = shield.x + SHIELD_THICKNESS / 2;
        shieldTop = shield.y - SHIELD_LENGTH / 2;
        shieldBottom = shield.y + SHIELD_LENGTH / 2;
    }
    
    // 矢印の当たり判定範囲
    const arrowLeft = arrow.x - ARROW_SIZE / 2;
    const arrowRight = arrow.x + ARROW_SIZE / 2;
    const arrowTop = arrow.y - ARROW_SIZE / 2;
    const arrowBottom = arrow.y + ARROW_SIZE / 2;
    
    // 矩形同士の衝突判定
    return !(arrowRight < shieldLeft || 
             arrowLeft > shieldRight || 
             arrowBottom < shieldTop || 
             arrowTop > shieldBottom);
}

// ========================================
// 矢印とハートの当たり判定
// ========================================
function checkArrowHeartCollision(arrow) {
    // ハートの当たり判定範囲（箱の内部）
    const heartLeft = BOX_X;
    const heartRight = BOX_X + BOX_SIZE;
    const heartTop = BOX_Y;
    const heartBottom = BOX_Y + BOX_SIZE;
    
    // 矢印の中心が箱の内部にあるかチェック
    return arrow.x > heartLeft && 
           arrow.x < heartRight && 
           arrow.y > heartTop && 
           arrow.y < heartBottom;
}

// ========================================
// 矢印の更新処理
// ========================================
function updateArrows() {
    // 各矢印を移動と当たり判定
    arrows.forEach(arrow => {
        if (!arrow.hit) { // まだ処理されていない矢印のみ
            arrow.x += arrow.vx;
            arrow.y += arrow.vy;
            
            // 盾との当たり判定
            if (checkArrowShieldCollision(arrow)) {
                arrow.hit = true; // 盾に当たった
                arrow.blocked = true;
            }
            // ハートとの当たり判定（盾に当たっていない場合）
            else if (checkArrowHeartCollision(arrow)) {
                arrow.hit = true; // ハートに当たった
                arrow.blocked = false;
                hp -= DAMAGE; // HPを減らす
                if (hp < 0) hp = 0;
            }
        }
    });

    // 画面外に出た矢印または当たった矢印を削除
    arrows = arrows.filter(arrow => {
        if (arrow.hit) return false; // 当たった矢印は削除
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

    // 盾を描画（回転あり）
    ctx.save();
    ctx.translate(shield.x, shield.y);
    ctx.rotate(shield.rotation);
    ctx.fillStyle = '#00ffff'; // 水色
    ctx.fillRect(-SHIELD_LENGTH/2, -SHIELD_THICKNESS/2, SHIELD_LENGTH, SHIELD_THICKNESS);
    ctx.strokeStyle = '#ffffff'; // 白い枠線
    ctx.lineWidth = 2;
    ctx.strokeRect(-SHIELD_LENGTH/2, -SHIELD_THICKNESS/2, SHIELD_LENGTH, SHIELD_THICKNESS);
    ctx.restore();

    // HPバーを描画
    const hpBarWidth = 200;
    const hpBarHeight = 20;
    const hpBarX = canvas.width / 2 - hpBarWidth / 2;
    const hpBarY = 50;
    
    // HPバーの背景
    ctx.fillStyle = '#800000';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
    
    // 現在のHP
    const hpWidth = (hp / MAX_HP) * hpBarWidth;
    ctx.fillStyle = '#ffff00'; // 黄色
    ctx.fillRect(hpBarX, hpBarY, hpWidth, hpBarHeight);
    
    // HPバーの枠線
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
    
    // HP数値表示
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${hp} / ${MAX_HP}`, canvas.width / 2, hpBarY - 10);
    
    // デバッグ情報を表示
    ctx.textAlign = 'left';
    ctx.fillText(`Arrows: ${arrows.length}/${ARROW_COUNT}`, 10, 30);
    ctx.fillText(`Shield: ${shield.direction}`, 10, 50);
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
