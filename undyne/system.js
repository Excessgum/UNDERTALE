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
// 画面レイアウト
const TOP_AREA_HEIGHT = 200; // 上部エリア（アンダイン）
const MIDDLE_AREA_HEIGHT = 300; // 中央エリア（戦闘）
const BOTTOM_AREA_HEIGHT = 100; // 下部エリア（ボタン）
const MIDDLE_AREA_Y = TOP_AREA_HEIGHT;
const BOTTOM_AREA_Y = TOP_AREA_HEIGHT + MIDDLE_AREA_HEIGHT;

// 戦闘エリアのサイズ（プレイヤーターン時は長方形、敵ターン時は正方形）
const BOX_WIDTH_PLAYER = 500; // プレイヤーターン時の幅
const BOX_HEIGHT_PLAYER = 250; // プレイヤーターン時の高さ
const BOX_SIZE_ENEMY = 70; // 敵ターン時のサイズ（正方形、ハート3個分程度）

// 現在の戦闘エリアのサイズ（動的に変更）
let currentBoxWidth = BOX_WIDTH_PLAYER;
let currentBoxHeight = BOX_HEIGHT_PLAYER;
let BOX_X = canvas.width / 2 - currentBoxWidth / 2;
let BOX_Y = MIDDLE_AREA_Y + (MIDDLE_AREA_HEIGHT - currentBoxHeight) / 2;

const HEART_SIZE = 20; // ハートのサイズ
let currentShieldLength = 60; // 盾の長さ（動的に変更）
const SHIELD_THICKNESS = 12; // 盾の厚さ
const ARROW_SIZE = 30; // 矢印のサイズ
const ARROW_SPEED = 6; // 矢印の速度
const ARROW_COUNT = 20; // 矢印の総数
const CLOSEST_THRESHOLD = 80; // 一番近いと判定する距離
const MAX_HP = 56; // プレイヤーの最大HP
const DAMAGE = 7; // 矢印1回のダメージ
const UNDYNE_MAX_HP = 27000; // アンダインの最大HP
const ATTACK_DAMAGE = 1500; // プレイヤーの攻撃ダメージ

// ========================================
// ゲーム状態の管理
// ========================================
let gameState = 'player'; // 'player' または 'enemy'
let hp = MAX_HP; // プレイヤーの現在のHP
let undyneHp = UNDYNE_MAX_HP; // アンダインの現在のHP

let heart = {
    x: canvas.width / 2,
    y: MIDDLE_AREA_Y + MIDDLE_AREA_HEIGHT / 2
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

// ボタンの選択状態
let selectedButton = 0; // 0: tatakau, 1: koudou, 2: aitemu, 3: minogasu

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
// 戦闘エリアの更新関数
// ========================================
function updateBoxSize(isPlayerTurn) {
    if (isPlayerTurn) {
        // プレイヤーターン：長方形
        currentBoxWidth = BOX_WIDTH_PLAYER;
        currentBoxHeight = BOX_HEIGHT_PLAYER;
        currentShieldLength = 60; // 通常の盾の長さ
    } else {
        // 敵ターン：正方形（盾の幅と同じ）
        currentBoxWidth = BOX_SIZE_ENEMY;
        currentBoxHeight = BOX_SIZE_ENEMY;
        currentShieldLength = BOX_SIZE_ENEMY; // 盾の長さを箱の幅と同じに（小さく）
    }
    BOX_X = canvas.width / 2 - currentBoxWidth / 2;
    BOX_Y = MIDDLE_AREA_Y + (MIDDLE_AREA_HEIGHT - currentBoxHeight) / 2;
    
    // ハートの位置を中央に更新
    heart.x = BOX_X + currentBoxWidth / 2;
    heart.y = BOX_Y + currentBoxHeight / 2;
}

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
    arrow04: new Image(),   // 上から（近い）
    undyne: new Image(),    // アンダイン
    tatakau: new Image(),   // 戦うボタン
    koudou: new Image(),    // 行動ボタン
    aitemu: new Image(),    // アイテムボタン
    minogasu: new Image()   // 見逃すボタン
};

images.arrow1.src = '../material/undyne/1.png';
images.arrow2.src = '../material/undyne/2.png';
images.arrow3.src = '../material/undyne/3.png';
images.arrow4.src = '../material/undyne/4.png';
images.arrow01.src = '../material/undyne/01.png';
images.arrow02.src = '../material/undyne/02.png';
images.arrow03.src = '../material/undyne/03.png';
images.arrow04.src = '../material/undyne/04.png';
images.undyne.src = '../material/undyne/u1.png';
images.tatakau.src = '../material/fight/tatakau.jpg';
images.koudou.src = '../material/fight/koudou.jpg';
images.aitemu.src = '../material/fight/aitemu.jpg';
images.minogasu.src = '../material/fight/minogasu.jpg';

// ========================================
// ボタンのクリック処理
// ========================================
canvas.addEventListener('click', (e) => {
    if (gameState !== 'player') return; // プレイヤーターンのみクリック可能
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // ボタンの位置とサイズ
    const buttonWidth = 140;
    const buttonHeight = 50;
    const buttonSpacing = (canvas.width - buttonWidth * 4) / 5;
    const buttonY = BOTTOM_AREA_Y + (BOTTOM_AREA_HEIGHT - buttonHeight) / 2;
    
    // どのボタンがクリックされたか判定
    for (let i = 0; i < 4; i++) {
        const buttonX = buttonSpacing * (i + 1) + buttonWidth * i;
        if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
            clickY >= buttonY && clickY <= buttonY + buttonHeight) {
            executeButtonAction(i);
            break;
        }
    }
});

// ========================================
// 敵ターン開始処理
// ========================================
function startEnemyTurn() {
    gameState = 'enemy';
    updateBoxSize(false); // 正方形に変形
    
    // 矢印をリセット
    arrows = [];
    arrowsSpawned = 0;
    spawnTimer = 0;
}

// ========================================
// プレイヤーターン開始処理
// ========================================
function startPlayerTurn() {
    gameState = 'player';
    updateBoxSize(true); // 長方形に戻す
}

// ========================================
// キーボード入力の処理
// ========================================
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    if (gameState === 'player') {
        // プレイヤーターン時はボタン選択
        if (key === 'a') {
            // 左に移動
            selectedButton--;
            if (selectedButton < 0) selectedButton = 3;
        } else if (key === 'd') {
            // 右に移動
            selectedButton++;
            if (selectedButton > 3) selectedButton = 0;
        } else if (key === 'enter' || key === ' ') {
            // ボタンを決定
            executeButtonAction(selectedButton);
        }
    } else if (gameState === 'enemy') {
        // 敵ターン時は盾の操作
        if (keys.hasOwnProperty(key)) {
            if (!keys[key]) {
                keys[key] = true;
                lastKeyPressed = key;
            }
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
// ボタンアクションの実行
// ========================================
function executeButtonAction(buttonIndex) {
    if (gameState !== 'player') return;
    
    switch(buttonIndex) {
        case 0: // tatakau
            // 攻撃処理
            undyneHp -= ATTACK_DAMAGE;
            if (undyneHp < 0) undyneHp = 0;
            // 敵ターンに移行
            startEnemyTurn();
            break;
        case 1: // koudou
            // TODO: 行動処理
            break;
        case 2: // aitemu
            // TODO: アイテム処理
            break;
        case 3: // minogasu
            // TODO: 見逃す処理
            break;
    }
}

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

    // 方向に応じた初期位置と速度を設定（ハートめがけて飛ぶ、遠くから）
    const heartX = heart.x;
    const heartY = heart.y;
    const distance = 400; // 矢印の生成距離
    
    switch(direction) {
        case 1: // 左から右へ（ハートめがけて）
            arrow.x = heartX - distance;
            arrow.y = heartY;
            arrow.vx = ARROW_SPEED;
            arrow.vy = 0;
            break;
        case 2: // 下から上へ（ハートめがけて）
            arrow.x = heartX;
            arrow.y = heartY + distance;
            arrow.vx = 0;
            arrow.vy = -ARROW_SPEED;
            break;
        case 3: // 右から左へ（ハートめがけて）
            arrow.x = heartX + distance;
            arrow.y = heartY;
            arrow.vx = -ARROW_SPEED;
            arrow.vy = 0;
            break;
        case 4: // 上から下へ（ハートめがけて）
            arrow.x = heartX;
            arrow.y = heartY - distance;
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
        shield.x = BOX_X + currentBoxWidth / 2;
        shield.y = BOX_Y - SHIELD_THICKNESS / 2;
        shield.rotation = 0; // 横棒
    } else if (lastKeyPressed === 'a') {
        shield.direction = 'left';
        shield.x = BOX_X - SHIELD_THICKNESS / 2;
        shield.y = BOX_Y + currentBoxHeight / 2;
        shield.rotation = Math.PI / 2; // 90度回転（縦棒）
    } else if (lastKeyPressed === 's') {
        shield.direction = 'down';
        shield.x = BOX_X + currentBoxWidth / 2;
        shield.y = BOX_Y + currentBoxHeight + SHIELD_THICKNESS / 2;
        shield.rotation = 0; // 横棒
    } else if (lastKeyPressed === 'd') {
        shield.direction = 'right';
        shield.x = BOX_X + currentBoxWidth + SHIELD_THICKNESS / 2;
        shield.y = BOX_Y + currentBoxHeight / 2;
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
        shieldLeft = shield.x - currentShieldLength / 2;
        shieldRight = shield.x + currentShieldLength / 2;
        shieldTop = shield.y - SHIELD_THICKNESS / 2;
        shieldBottom = shield.y + SHIELD_THICKNESS / 2;
    } else {
        // 縦棒
        shieldLeft = shield.x - SHIELD_THICKNESS / 2;
        shieldRight = shield.x + SHIELD_THICKNESS / 2;
        shieldTop = shield.y - currentShieldLength / 2;
        shieldBottom = shield.y + currentShieldLength / 2;
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
    const heartRight = BOX_X + currentBoxWidth;
    const heartTop = BOX_Y;
    const heartBottom = BOX_Y + currentBoxHeight;
    
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
    if (gameState !== 'enemy') return; // 敵ターンのみ矢印を更新
    
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
                if (hp <= 0) {
                    hp = 0;
                    // ゲームオーバー画面に遷移
                    window.location.href = 'gameover.html';
                }
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
    
    // 20回の攻撃が終わったらプレイヤーターンに戻る
    if (arrowsSpawned >= ARROW_COUNT && arrows.length === 0) {
        startPlayerTurn();
    }
}

// ========================================
// 描画処理
// ========================================
function draw() {
    // 背景をクリア
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 上部エリア：アンダインを描画
    const undyneWidth = 240;
    const undyneHeight = 240;
    const undyneX = canvas.width / 2 - undyneWidth / 2;
    const undyneY = TOP_AREA_HEIGHT / 2 - undyneHeight / 2;
    ctx.drawImage(images.undyne, undyneX, undyneY, undyneWidth, undyneHeight);

    // 中央エリア：戦闘エリア（長方形または正方形）を描画
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.strokeRect(BOX_X, BOX_Y, currentBoxWidth, currentBoxHeight);
    
    // プレイヤーターン時はテキストを表示
    if (gameState === 'player') {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('アンダインが立ちはだかっている！', BOX_X + currentBoxWidth / 2, BOX_Y + currentBoxHeight / 2 - 20);
        ctx.fillText('どうする？', BOX_X + currentBoxWidth / 2, BOX_Y + currentBoxHeight / 2 + 20);
    }

    // 下部エリア：ボタンを等間隔で配置
    const buttonWidth = 140;
    const buttonHeight = 50;
    const buttonSpacing = (canvas.width - buttonWidth * 4) / 5;
    const buttonY = BOTTOM_AREA_Y + (BOTTOM_AREA_HEIGHT - buttonHeight) / 2;
    
    const buttons = [images.tatakau, images.koudou, images.aitemu, images.minogasu];
    
    // 4つのボタンを描画
    for (let i = 0; i < 4; i++) {
        const buttonX = buttonSpacing * (i + 1) + buttonWidth * i;
        ctx.drawImage(buttons[i], buttonX, buttonY, buttonWidth, buttonHeight);
        
        // 選択されているボタンに黄色い枠を描画
        if (gameState === 'player' && i === selectedButton) {
            ctx.strokeStyle = '#ffff00'; // 黄色
            ctx.lineWidth = 4;
            ctx.strokeRect(buttonX - 2, buttonY - 2, buttonWidth + 4, buttonHeight + 4);
        }
    }

    // ハート（♡）を描画（緑色）
    ctx.fillStyle = '#00ff00';
    ctx.font = `${HEART_SIZE}px Arial`;
    ctx.fillText('♡', heart.x - HEART_SIZE/2, heart.y + HEART_SIZE/2);

    // 各方向で最も近い矢印を特定
    const closestArrows = getClosestArrowByDirection();

    // 矢印を描画（敵ターンのみ）
    if (gameState === 'enemy') {
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
    }

    // 盾を描画（敵ターンのみ）
    if (gameState === 'enemy') {
        ctx.save();
        ctx.translate(shield.x, shield.y);
        ctx.rotate(shield.rotation);
        ctx.fillStyle = '#00ffff'; // 水色
        ctx.fillRect(-currentShieldLength/2, -SHIELD_THICKNESS/2, currentShieldLength, SHIELD_THICKNESS);
        ctx.strokeStyle = '#ffffff'; // 白い枠線
        ctx.lineWidth = 2;
        ctx.strokeRect(-currentShieldLength/2, -SHIELD_THICKNESS/2, currentShieldLength, SHIELD_THICKNESS);
        ctx.restore();
    }

    // HPバーを描画（中央エリアの左上）
    const hpBarWidth = 200;
    const hpBarHeight = 20;
    const hpBarX = BOX_X + 10;
    const hpBarY = MIDDLE_AREA_Y + 10;
    
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
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${hp} / ${MAX_HP}`, hpBarX, hpBarY - 5);
    
    // アンダインのHPを表示
    ctx.fillText(`Undyne HP: ${undyneHp} / ${UNDYNE_MAX_HP}`, hpBarX, hpBarY + hpBarHeight + 20);
}

// ========================================
// ゲームループ
// ========================================
function gameLoop() {
    // 矢印を定期的に生成（敵ターンで全20個まで）
    if (gameState === 'enemy' && arrowsSpawned < ARROW_COUNT) {
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
            updateBoxSize(true); // 初期状態は長方形
            gameLoop();
        }
    };
});
