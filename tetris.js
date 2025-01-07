// Canvas ayarlarını düzenleyelim
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('tetris'));
const context = canvas.getContext('2d');

// Canvas boyutlarını ayarla
canvas.width = 240;
canvas.height = 400;

// Ölçeklendirmeyi düzelt
context.scale(20, 20);

// Skor elementini tanımlayalım
const scoreElement = document.getElementById('score');

// Oyun değişkenlerini tanımlayalım
let score = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000; // Başlangıç hızı
let lastTime = 0;
let linesCleared = 0; // Temizlenen satır sayısı

// Arena matrisini tanımlayalım
const arena = createMatrix(12, 20);

// Oyuncu nesnesini tanımlayalım
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0
};

// Matrix oluşturma fonksiyonu
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// Tetris parçalarının renkleri
let colors = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF'
];

// Tetris parçalarını tanımlayalım
const pieces = [
    [[1, 1, 1, 1]],                // I
    [[2, 2], [2, 2]],             // O
    [[0, 3, 0], [3, 3, 3]],       // T
    [[0, 4, 4], [4, 4, 0]],       // S
    [[5, 5, 0], [0, 5, 5]],       // Z
    [[6, 0, 0], [6, 6, 6]],       // J
    [[0, 0, 7], [7, 7, 7]]        // L
];

function createPiece(type) {
    switch(type) {
        case 'I': return [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];
        case 'L': return [
            [0, 0, 7, 0],
            [7, 7, 7, 0],
            [0, 0, 0, 0]
        ];
        case 'J': return [
            [6, 0, 0, 0],
            [6, 6, 6, 0],
            [0, 0, 0, 0]
        ];
        case 'O': return [
            [2, 2],
            [2, 2]
        ];
        case 'T': return [
            [0, 3, 0],
            [3, 3, 3],
            [0, 0, 0]
        ];
        case 'S': return [
            [0, 4, 4],
            [4, 4, 0],
            [0, 0, 0]
        ];
        case 'Z': return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0]
        ];
    }
}

// Oyun fonksiyonlarını tanımlayalım
function playerReset() {
    const pieces = 'ILJOTSZ';
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    player.matrix = createPiece(randomPiece);
    player.pos.y = 0;
    player.pos.x = Math.floor((arena[0].length - player.matrix[0].length) / 2);
}

function updateScore() {
    scoreElement.innerText = 
        `SKOR: ${score}\n` +
        `SEVİYE: ${game.level}\n` +
        `SATIR: ${linesCleared}/${game.requiredLines}`;
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Izgarayı çiz
    drawGrid();
    
    // Arena ve oyuncu parçalarını çiz
    drawMatrix(arena, {x: 0, y: 0});
    if (player.matrix) {
        drawMatrix(player.matrix, player.pos);
    }

    // Çıkış butonu (*)
    context.fillStyle = '#FF0D72';
    context.font = '1.2px "Press Start 2P"';
    context.textAlign = 'center';
    context.fillText('×', 1, 1.5);
}

function update(time = 0) {
    // Eğer oyun bitmişse hiçbir şey yapma      
    if (game.isGameOver) {
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
        dropCounter = 0;
    }
    
    draw();
    
    // Oyun bitmemişse devam et
    if (!game.isGameOver) {
        game.animationId = requestAnimationFrame(update);
    }
}

function handleGameClick(x, y) {
    const scaledX = x / 20;
    const scaledY = y / 20;

    // Çıkış butonu (×) için daha küçük tıklama alanı
    if (scaledX >= 0.5 && scaledX <= 1.5 &&
        scaledY >= 0.5 && scaledY <= 1.5) {
        game.currentScreen = 'menu';
        game.mainMenu.draw(game.ctx);
        cancelAnimationFrame(game.animationId);
    }
}

// Canvas click event listener'ını güncelle
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (game.currentScreen === 'menu') {
        game.mainMenu.handleClick(x, y);
    } else if (game.currentScreen === 'settings') {
        game.handleSettingsClick(x, y);
    } else if (game.currentScreen === 'levelSelect') {
        game.handleLevelSelect(x, y);
    } else if (game.currentScreen === 'game' && !game.isGameOver) {
        if (x < 30 && y < 30) {
            game.currentScreen = 'menu';
            game.mainMenu.draw(game.ctx);
            cancelAnimationFrame(game.animationId);
        } else {
            game.togglePause();
        }
    }
});

// MainMenu sınıfını Game sınıfından önce tanımlayalım
class MainMenu {
    constructor(game) {
        this.game = game;
        const centerX = canvas.width / 40;
        this.buttons = {
            start: {
                text: "BAŞLA",
                x: centerX - 3,
                y: 4,
                width: 6,
                height: 1.5,
                color: '#FF0D72'
            },
            settings: {
                text: "AYARLAR",
                x: centerX - 3,
                y: 7,
                width: 6,
                height: 1.5,
                color: '#0DC2FF'
            },
            level: {
                text: "SEVİYE",
                x: centerX - 3,
                y: 10,
                width: 6,
                height: 1.5,
                color: '#0DFF72'
            },
            feedback: {
                text: "İLETİŞİM",
                x: centerX - 3,
                y: 13,
                width: 6,
                height: 1.5,
                color: '#FFE138'
            },
            exit: {
                text: "ÇIKIŞ",
                x: centerX - 3,
                y: 16,
                width: 6,
                height: 1.5,
                color: '#FF0000'
            }
        };
    }

    draw(ctx) {
        // Arka plan
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width/20, canvas.height/20);
        
        // Başlık
        ctx.fillStyle = '#FF0D72';
        ctx.font = '1.8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('TETRİS', canvas.width/40, 2);

        // Butonları çiz
        Object.values(this.buttons).forEach(button => {
            // Buton arka planı
            ctx.fillStyle = button.color;
            ctx.fillRect(
                button.x,
                button.y,
                button.width,
                button.height
            );

            // Buton metni
            ctx.fillStyle = '#000000';
            ctx.font = '0.7px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(
                button.text,
                button.x + button.width/2,
                button.y + button.height/2 + 0.2
            );
        });
    }

    handleClick(x, y) {
        const scaledX = x / 20;
        const scaledY = y / 20;

        // Tıklama alanını genişlet
        const hitArea = 0.3; // Tıklama toleransı

        Object.entries(this.buttons).forEach(([key, button]) => {
            if (scaledX >= button.x - hitArea && 
                scaledX <= button.x + button.width + hitArea &&
                scaledY >= button.y - hitArea && 
                scaledY <= button.y + button.height + hitArea) {
                
                this.game.playSound('move');
                
                switch(key) {
                    case 'start':
                        this.game.startGame();
                        break;
                    case 'settings':
                        this.game.openSettings();
                        break;
                    case 'level':
                        this.openLevelSelect();
                        break;
                    case 'feedback':
                        window.open('mailto:your@email.com?subject=Tetris Feedback', '_blank');
                        break;
                    case 'exit':
                        if (confirm('Oyundan çıkmak istediğinize emin misiniz?')) {
                            window.close();
                            // Eğer window.close() çalışmazsa
                            document.location.href = "about:blank";
                        }
                        break;
                }
            }
        });
    }

    openLevelSelect() {
        this.game.currentScreen = 'levelSelect';
        this.game.drawLevelSelect();
    }
}

// Matrix çizme fonksiyonu
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Parçayı çiz
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // Parça kenarlarını çiz
                context.strokeStyle = 'rgba(255,255,255,0.2)';
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Ses yönetimi için yeni bir sınıf oluşturalım
class SoundManager {
    constructor() {
        this.sounds = {
            move: new Audio('sounds/move.mp3'),
            rotate: new Audio('sounds/rotate.mp3'),
            drop: new Audio('sounds/drop.mp3'),
            clear: new Audio('sounds/clear.mp3'),
            levelUp: new Audio('sounds/levelup.mp3'),
            gameOver: new Audio('sounds/gameover.mp3')
        };
        
        // Tüm seslerin sesini ayarla
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
            // Her ses bittiğinde currentSound'u null yap
            sound.onended = () => {
                this.currentSound = null;
            };
        });

        // Özel ses ayarları
        this.sounds.levelUp.volume = 0.4;
        this.sounds.gameOver.volume = 0.5;
        
        // Şu anda çalan ses
        this.currentSound = null;
        
        // Son ses çalma zamanı
        this.lastPlayTime = 0;
        // Minimum ses aralığı (milisaniye)
        this.minPlayInterval = 50;
    }

    play(soundName) {
        try {
            const currentTime = Date.now();
            // Eğer son ses çalmasından bu yana yeterli süre geçmediyse çalma
            if (currentTime - this.lastPlayTime < this.minPlayInterval) {
                return;
            }

            const sound = this.sounds[soundName];
            if (sound) {
                // Eğer başka bir ses çalıyorsa onu durdur
                if (this.currentSound) {
                    this.currentSound.pause();
                    this.currentSound.currentTime = 0;
                }

                // Yeni sesi çal
                sound.currentTime = 0;
                this.currentSound = sound;
                this.lastPlayTime = currentTime;
                
                sound.play().catch(error => {
                    console.log('Ses çalma hatası:', error);
                });
            }
        } catch (error) {
            console.log('Ses hatası:', error);
        }
    }

    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.currentSound = null;
    }
}

// Game sınıfında ses yönetimini güncelle
class Game {
    constructor() {
        this.mainMenu = new MainMenu(this);
        this.currentScreen = 'menu';
        this.ctx = context;
        this.isGameOver = false;
        this.animationId = null;
        this.colors = [...colors]; // Renklerin kopyasını tut
        this.isPaused = false; // Duraklama durumu için yeni değişken
        this.level = 1;
        this.requiredLines = 12; // İlk seviye için gereken satır
        this.soundEnabled = true; // Ses durumu
        this.colorSchemes = {
            classic: [
                null,
                '#FF0D72', // I
                '#0DC2FF', // O
                '#0DFF72', // T
                '#F538FF', // S
                '#FF8E0D', // Z
                '#FFE138', // J
                '#3877FF'  // L
            ],
            neon: [
                null,
                '#FF1177',
                '#00FFFF',
                '#00FF00',
                '#FF00FF',
                '#FFAA00',
                '#FFFF00',
                '#00AAFF'
            ],
            pastel: [
                null,
                '#FFB3B3',
                '#B3FFFF',
                '#B3FFB3',
                '#FFB3FF',
                '#FFE6B3',
                '#FFFFB3',
                '#B3E6FF'
            ]
        };
        this.highScores = this.loadHighScores();
        this.soundManager = new SoundManager();
    }

    init() {
        console.log('Oyun başlatılıyor...');
        // Menü ekranını göster
        this.currentScreen = 'menu';
        this.mainMenu.draw(this.ctx);
        
        // Menüyü sürekli çiz
        const animate = () => {
            if (this.currentScreen === 'menu') {
                this.mainMenu.draw(this.ctx);
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    startGame() {
        console.log('Oyun başlatılıyor...');
        this.currentScreen = 'game';
        this.isGameOver = false;
        this.isPaused = false;
        
        // Değişkenleri sıfırla
        score = 0;
        dropCounter = 0;
        lastTime = 0;
        linesCleared = 0;
        this.level = 1;
        this.requiredLines = 12;
        dropInterval = 1000;
        
        // Arena'yı temizle
        arena.forEach(row => row.fill(0));
        
        // İlk parçayı oluştur
        playerReset();
        updateScore();
        
        // Oyun döngüsünü başlat
        this.animate(0);
        this.playSound('levelUp');
    }

    animate(time = 0) {
        if (this.currentScreen !== 'game' || this.isGameOver || this.isPaused) {
            return;
        }

        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
            dropCounter = 0;
        }

        draw();
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    gameOver() {
        // Animasyonu durdur
        this.isGameOver = true;
        this.currentScreen = 'gameOver';
        cancelAnimationFrame(this.animationId);

        // Skoru kaydet
        this.saveHighScore(score, this.level);

        const centerX = canvas.width/40;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, canvas.width/20, canvas.height/20);

        // Oyun bitti mesajı
        this.ctx.fillStyle = '#FF0D72';
        this.ctx.font = '1px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OYUN BİTTİ', centerX, 4);
        
        // Skor ve seviye
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '0.6px "Press Start 2P"';
        this.ctx.fillText(`SKOR: ${score}`, centerX, 7);
        this.ctx.fillText(`SEVİYE: ${this.level}`, centerX, 9);

        // En yüksek skorlar başlığı
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '0.6px "Press Start 2P"';
        this.ctx.fillText('EN YÜKSEK SKORLAR:', centerX, 11);
        
        // En yüksek 3 skor
        this.highScores.slice(0, 3).forEach((highScore, index) => {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '0.5px "Press Start 2P"';
            this.ctx.fillText(
                `${index + 1}. ${highScore.score} (Svy:${highScore.level})`,
                centerX,
                13 + index * 2
            );
        });

        // Yeniden başla butonu
        this.ctx.fillStyle = '#0DFF72';
        this.ctx.fillRect(centerX - 4, 18, 8, 1.5);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 0.1;
        this.ctx.strokeRect(centerX - 4, 18, 8, 1.5);
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '0.6px "Press Start 2P"';
        this.ctx.fillText('YENİDEN BAŞLA', centerX, 19);

        // Menü butonu
        this.ctx.fillStyle = '#0DC2FF';
        this.ctx.fillRect(centerX - 4, 20, 8, 1.5);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 0.1;
        this.ctx.strokeRect(centerX - 4, 20, 8, 1.5);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText('MENÜ', centerX, 21);

        // Tıklama olayını ekle
        const clickHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / 20;
            const y = (e.clientY - rect.top) / 20;

            // Yeniden başla butonu
            if (y >= 18 && y <= 19.5 && Math.abs(x - centerX) < 4) {
                canvas.removeEventListener('click', clickHandler);
                this.restart();
            }
            // Menü butonu
            else if (y >= 20 && y <= 21.5 && Math.abs(x - centerX) < 4) {
                canvas.removeEventListener('click', clickHandler);
                this.currentScreen = 'menu';
                this.mainMenu.draw(this.ctx);
            }
        };

        canvas.addEventListener('click', clickHandler);
    }

    restart() {
        this.isGameOver = false;
        this.currentScreen = 'game';
        score = 0;
        dropCounter = 0;
        lastTime = 0;
        
        // Arena'yı temizle
        arena.forEach(row => row.fill(0));
        
        // Oyuncuyu sıfırla
        playerReset();
        updateScore();
        
        // Animasyonu yeniden başlat
        cancelAnimationFrame(this.animationId);
        this.animate();
    }

    openSettings() {
        this.currentScreen = 'settings';
        this.drawSettings();
    }

    handleSettingsClick(x, y) {
        const scaledX = x / 20;
        const scaledY = y / 20;
        const centerX = canvas.width/40;

        // Renk şemaları için tıklama kontrolü
        if (scaledY >= 6 && scaledY <= 11) {
            const schemeIndex = Math.floor((scaledY - 6) / 2);
            if (schemeIndex >= 0 && schemeIndex < 3) {
                this.currentScheme = schemeIndex;
                this.colors = [...this.colorSchemes[Object.keys(this.colorSchemes)[schemeIndex]]];
                colors = [...this.colors];
                this.playSound('move');
            }
        }

        // Ses açma/kapama kontrolü
        if (scaledY >= 14 && scaledY <= 16) {
            if (Math.abs(scaledX - centerX) < 2) {
                this.soundEnabled = !this.soundEnabled;
                if (this.soundEnabled) this.playSound('move');
            }
        }

        // Ses seviyesi kontrolleri
        if (scaledY >= 16 && scaledY <= 18) {
            // Ses azaltma (-)
            if (scaledX >= centerX - 3 && scaledX <= centerX - 1) {
                const newVolume = Math.max(0, this.soundManager.sounds.move.volume - 0.1);
                this.updateVolume(newVolume);
            }
            // Ses artırma (+)
            if (scaledX >= centerX + 1 && scaledX <= centerX + 3) {
                const newVolume = Math.min(1, this.soundManager.sounds.move.volume + 0.1);
                this.updateVolume(newVolume);
            }
        }

        // Geri dön butonu
        if (scaledY >= 19 && scaledY <= 20.5 && 
            Math.abs(scaledX - centerX) < 3) {
            this.currentScreen = 'menu';
            this.mainMenu.draw(this.ctx);
            if (this.soundEnabled) this.playSound('move');
            return;
        }

        this.drawSettings();
    }

    // Ses seviyesi güncelleme için yeni metod
    updateVolume(newVolume) {
        Object.values(this.soundManager.sounds).forEach(sound => {
            sound.volume = newVolume;
        });
        if (this.soundEnabled) this.playSound('move');
    }

    drawSettings() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width/20, canvas.height/20);
        
        const centerX = canvas.width/40;
        
        // Başlık
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '1px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('AYARLAR', centerX, 3);

        // Renk şemaları başlığı
        this.ctx.font = '0.7px "Press Start 2P"';
        this.ctx.fillText('RENK ŞEMASI', centerX, 5);
        
        // Renk şemaları seçenekleri
        const schemes = ['KLASİK', 'NEON', 'PASTEL'];
        schemes.forEach((scheme, i) => {
            this.ctx.fillStyle = i === this.currentScheme ? '#FFD700' : '#FFFFFF';
            this.ctx.fillText(scheme, centerX, 7 + i * 2);
        });

        // Ses ayarları başlığı
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('SES', centerX, 13);
        
        // Ses durumu
        this.ctx.fillStyle = this.soundEnabled ? '#00FF00' : '#FF0000';
        this.ctx.fillText(this.soundEnabled ? 'AÇIK' : 'KAPALI', centerX, 15);
        
        // Ses seviyesi
        this.ctx.fillStyle = '#FFFFFF';
        const volume = Math.round(this.soundManager.sounds.move.volume * 100);
        this.ctx.fillText(`SEVİYE: %${volume}`, centerX, 17);
        
        // Ses kontrolleri
        this.ctx.fillStyle = '#0DC2FF';
        this.ctx.fillText('-', centerX - 2, 17);
        this.ctx.fillText('+', centerX + 2, 17);

        // Geri dön butonu
        this.ctx.fillStyle = '#FF0D72';
        this.ctx.fillRect(centerX - 3, 19, 6, 1.5);
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '0.7px "Press Start 2P"';
        this.ctx.fillText('GERİ DÖN', centerX, 20);
    }

    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            // Oyunu duraklat
            cancelAnimationFrame(this.animationId);
            // Duraklama ekranını göster
            this.drawPauseScreen();
        } else {
            // Oyunu devam ettir
            this.animate(0);
        }
    }

    drawPauseScreen() {
        const centerX = canvas.width/40;
        
        // Yarı saydam siyah arka plan
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, canvas.width/20, canvas.height/20);
        
        // DURAKLATILDI yazısı
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '0.8px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DURAKLATILDI', centerX, 7);
        
        // Devam etmek için tıklayın yazısı
        this.ctx.font = '0.5px "Press Start 2P"';
        this.ctx.fillText('DEVAM ETMEK İÇİN', centerX, 9);
        this.ctx.fillText('TIKLAYIN', centerX, 10);
    }

    updateLevel() {
        // Seviye atlama koşullarını kontrol et
        if (linesCleared >= this.requiredLines) {
            this.level++;
            // Seviye geçiş ekranını göster ve yeni seviyeyi başlat
            this.showLevelComplete();
        }
    }

    showLevelComplete() {
        this.isPaused = true;
        cancelAnimationFrame(this.animationId);
        
        const centerX = canvas.width/40;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, canvas.width/20, canvas.height/20);
        
        // Seviye tamamlandı mesajı
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '1px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`SEVİYE ${this.level-1}`, centerX, 6);
        this.ctx.fillText('TAMAMLANDI!', centerX, 8);
        
        // Skor göster
        this.ctx.font = '0.7px "Press Start 2P"';
        this.ctx.fillText(`SKOR: ${score}`, centerX, 10);
        
        // 2 saniye sonra yeni seviyeye geç
        setTimeout(() => {
            this.startNextLevel();
        }, 2000);
    }

    startNextLevel() {
        // Yeni seviye için değişkenleri ayarla
        this.isPaused = false;
        score = 0;  // Skoru sıfırla
        linesCleared = 0;  // Temizlenen satır sayısını sıfırla
        this.requiredLines += 4;  // Gereken satır sayısını artır
        
        // Hızı %10 artır (dropInterval'i %10 azalt)
        dropInterval = Math.max(100, 1000 * Math.pow(0.9, this.level - 1));
        
        // Arena'yı temizle
        arena.forEach(row => row.fill(0));
        
        // Yeni parça oluştur
        playerReset();
        updateScore();
        
        // Oyunu devam ettir
        this.animate(0);
        this.playSound('levelUp');
    }

    // Ses çalma fonksiyonu
    playSound(soundName) {
        if (this.soundEnabled) {
            this.soundManager.play(soundName);
        }
    }

    // Yüksek skorları yükle
    loadHighScores() {
        const scores = localStorage.getItem('tetrisHighScores');
        return scores ? JSON.parse(scores) : [];
    }

    // Yeni skoru kaydet
    saveHighScore(score, level) {
        const newScore = {
            score: score,
            level: level,
            date: new Date().toLocaleDateString('tr-TR')
        };

        this.highScores.push(newScore);
        // Skorları büyükten küçüğe sırala
        this.highScores.sort((a, b) => b.score - a.score);
        // En yüksek 10 skoru tut
        this.highScores = this.highScores.slice(0, 10);
        
        // LocalStorage'a kaydet
        localStorage.setItem('tetrisHighScores', JSON.stringify(this.highScores));
    }

    drawLevelSelect() {
        const centerX = canvas.width/40;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvas.width/20, canvas.height/20);
        
        // Başlık
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '1px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SEVİYE SEÇ', centerX, 3);
        
        // Seviye butonları
        for(let i = 1; i <= 4; i++) {  // 5 yerine 4 seviye
            this.ctx.fillStyle = '#0DFF72';
            this.ctx.fillRect(centerX - 3, 5 + i * 3, 6, 2);
            
            // Buton metni
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '0.8px "Press Start 2P"';
            this.ctx.fillText(`SEVİYE ${i}`, centerX, 6.2 + i * 3);
        }
        
        // Geri dön butonu
        this.ctx.fillStyle = '#FF0D72';
        this.ctx.fillRect(centerX - 3, 19, 6, 1.5);
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '0.7px "Press Start 2P"';
        this.ctx.fillText('GERİ DÖN', centerX, 20);
    }

    handleLevelSelect(x, y) {
        const scaledX = x / 20;
        const scaledY = y / 20;
        const centerX = canvas.width/40;

        // Seviye seçimi
        for(let i = 1; i <= 4; i++) {  // 5 yerine 4 seviye
            if (scaledY >= (5 + i * 3) && scaledY <= (7 + i * 3) &&
                Math.abs(scaledX - centerX) < 3) {
                this.level = i;
                this.requiredLines = 12 + (i - 1) * 4;  // Her seviye için gereken satır sayısı
                dropInterval = Math.max(100, 1000 * Math.pow(0.9, i - 1));  // Başlangıç hızı
                this.startGame();
                return;
            }
        }

        // Geri dön butonu
        if (scaledY >= 19 && scaledY <= 20.5 && 
            Math.abs(scaledX - centerX) < 3) {
            this.currentScreen = 'menu';
            this.mainMenu.draw(this.ctx);
            if (this.soundEnabled) this.playSound('move');
        }
    }
}

// Oyunu başlat
const game = new Game();
game.init();

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        game.playSound('drop');
    }
    dropCounter = 0;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
    
    // Merge işleminden sonra game over kontrolü
    if (checkGameOver()) {
        console.log("Merge sonrası game over!");
        game.gameOver();
    }
}

function arenaSweep() {
    let rowCount = 1;
    let clearedRows = 0;
    
    for (let y = arena.length - 1; y > 0; --y) {
        if (arena[y].every(value => value !== 0)) {
            const row = arena.splice(y, 1)[0].fill(0);
            arena.unshift(row);
            ++y;
            clearedRows++;
            
            // Skor hesaplama
            score += rowCount * 10 * game.level;
            rowCount *= 2;
        }
    }
    
    if (clearedRows > 0) {
        linesCleared += clearedRows;
        game.updateLevel();
        updateScore();
        game.playSound('clear');
    }
}

// Oyun bitiş kontrolü için yeni bir fonksiyon ekleyelim
function checkGameOver() {
    // İlk 2 satırda herhangi bir parça varsa oyun biter
    return arena[0].some(value => value !== 0) || arena[1].some(value => value !== 0);
}

// Klavye kontrollerini ekleyelim
document.addEventListener('keydown', event => {
    if (game.currentScreen === 'game' && !game.isGameOver) {
        switch (event.key) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowDown':
                playerDrop();
                break;
            case 'ArrowUp':
                playerRotate(1);  // Parçayı döndür
                break;
            case ' ': // Space tuşu
                game.togglePause();
                break;
        }
    }
});

// Oyuncuyu hareket ettirme fonksiyonu
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    } else {
        game.playSound('move');
    }
}

// Oyuncuyu döndürme fonksiyonu
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    
    // Matrisi döndür
    rotate(player.matrix, dir);
    
    // Çarpışma varsa pozisyonu ayarla
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    if (!collide(arena, player)) {
        game.playSound('rotate');
    }
}

// Matris döndürme fonksiyonu
function rotate(matrix, dir) {
    // Matrisin kopyasını oluştur
    const N = matrix.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    
    // Saat yönünde 90 derece döndür
    if (dir > 0) {
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                rotated[x][N - 1 - y] = matrix[y][x];
            }
        }
    }
    // Saat yönünün tersine 90 derece döndür
    else {
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                rotated[N - 1 - x][y] = matrix[y][x];
            }
        }
    }
    
    // Orijinal matrisi güncelle
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            matrix[y][x] = rotated[y][x];
        }
    }
}

// Izgara çizme fonksiyonunu ekleyelim
function drawGrid() {
    const gridSize = 20;
    context.strokeStyle = '#333';
    context.lineWidth = 0.5;

    // Dikey çizgiler
    for (let x = 0; x <= canvas.width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
    }

    // Yatay çizgiler
    for (let y = 0; y <= canvas.height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
    }
}