const diceOne = '<img alt="1" src="./images/dice-six-faces-one.png">';
const diceTwo = '<img alt="2" src="./images/dice-six-faces-two.png">';
const diceThree = '<img alt="3" src="./images/dice-six-faces-three.png">';
const diceFour = '<img alt="4" src="./images/dice-six-faces-four.png">';
const diceFive = '<img alt="5" src="./images/dice-six-faces-five.png">';
const diceSix = '<img alt="6" src="./images/dice-six-faces-six.png">';

const diceArray = [diceOne, diceTwo, diceThree, diceFour, diceFive, diceSix];

const rollButton = document.getElementById('roll-button');
let totalTurns = 0;
let yahtzeeBonus = 0;

rollButton.addEventListener('click', () => {
    const playDice = [
        document.getElementById('playOne'),
        document.getElementById('playTwo'),
        document.getElementById('playThree'),
        document.getElementById('playFour'),
        document.getElementById('playFive')
    ];

    const activeDice = playDice.filter(die => die.style.display !== 'none');

    activeDice.forEach(die => {
        const roll = Math.floor(Math.random() * 6);
        die.innerHTML = diceArray[roll];
        die.style.display = 'block';
    });

    document.getElementById('unset-dice').style.display = 'none';

    const rollCountElement = document.getElementById('roll-count');
    let currentValue = parseInt(rollCountElement.textContent);
    if (currentValue > 0) rollCountElement.textContent = currentValue - 1;
    if (rollCountElement.textContent === '0') rollButton.disabled = true;

    calculatePotentialScores();
    randomizeDicePositions();
});

function randomizeDicePositions() {
    const playspace = document.getElementById('playspace');
    const dice = playspace.querySelectorAll('.playdice');
    const spaceWidth = playspace.clientWidth;
    const spaceHeight = playspace.clientHeight;
    const placedPositions = [];

    dice.forEach(die => {
        if (!die.innerHTML.trim() || die.style.display === 'none') return;
        const dieWidth = die.offsetWidth;
        const dieHeight = die.offsetHeight;
        let x, y, safe = false, attempts = 0;
        while (!safe && attempts < 100) {
            x = Math.random() * (spaceWidth - dieWidth);
            y = Math.random() * (spaceHeight - dieHeight);
            safe = true;
            for (const pos of placedPositions) {
                const dx = Math.abs(pos.x - x);
                const dy = Math.abs(pos.y - y);
                if (dx < dieWidth && dy < dieHeight) { safe = false; break; }
            }
            attempts++;
        }
        die.style.left = x + 'px';
        die.style.top = y + 'px';
        placedPositions.push({ x, y });
    });
}

document.querySelectorAll('.playdice').forEach(die => {
    die.addEventListener('click', () => {
        if (!die.innerHTML.trim()) return;
        const diceClass = [...die.classList].find(cls => cls.startsWith('dice'));
        const keeperSlot = document.querySelector('#keeper-dice .' + diceClass);
        keeperSlot.innerHTML = die.innerHTML;
        die.innerHTML = '';
        die.style.display = 'none';
        updateKeeperCursor();
        calculatePotentialScores();
    });
});

document.querySelectorAll('.keepDice').forEach(keeperDie => {
    keeperDie.style.cursor = 'default';
    keeperDie.addEventListener('click', () => {
        if (!keeperDie.innerHTML.trim()) return;
        const diceClass = [...keeperDie.classList].find(cls => cls.startsWith('dice'));
        const playSlot = document.querySelector('#playspace .' + diceClass);
        playSlot.innerHTML = keeperDie.innerHTML;
        playSlot.style.display = 'block';
        keeperDie.innerHTML = '';
        updateKeeperCursor();
        calculatePotentialScores();
    });
});

function updateKeeperCursor() {
    document.querySelectorAll('.keepDice').forEach(keeperDie => {
        keeperDie.style.cursor = keeperDie.innerHTML.trim() ? 'pointer' : 'default';
    });
}

function calculatePotentialScores() {
    const allDice = Array.from(document.querySelectorAll('.playdice, .keepDice'))
        .map(die => die.innerHTML.trim() ? parseInt(die.querySelector('img').alt) : null)
        .filter(Boolean);

    const upperMapping = ['aces','twos','threes','fours','fives','sixes'];
    upperMapping.forEach((id,index) => {
        const td = document.getElementById(`${id}-score`);
        if(td.dataset.locked) return;
        const count = allDice.filter(d=>d===index+1).length;
        td.textContent = count ? count*(index+1) : '';
        td.style.color = count ? 'red' : '';
    });

    const upperScores = upperMapping.map(id => parseInt(document.getElementById(`${id}-score`).textContent) || 0);
    const upperTotal = upperScores.reduce((a,b)=>a+b,0);
    document.getElementById('upper-score').textContent = upperTotal;
    const bonus = upperTotal >= 63 ? 35 : 0;
    document.getElementById('bonus-score').textContent = bonus;
    document.getElementById('total-upper-score').textContent = upperTotal + bonus;

    const lowerScores = {
        'three-kind-score': sumIfKind(allDice, 3),
        'four-kind-score': sumIfKind(allDice, 4),
        'full-house-score': isFullHouse(allDice) ? 25 : '',
        'small-straight-score': hasSmallStraight(allDice) ? 30 : '',
        'large-straight-score': hasLargeStraight(allDice) ? 40 : '',
        'yahtzee-score': allDice.length===5 && new Set(allDice).size===1 ? 50 : '',
        'chance-score': allDice.length>0 ? allDice.reduce((a,b)=>a+b,0) : ''
    };

    Object.keys(lowerScores).forEach(id=>{
        const td = document.getElementById(id);
        if(td.dataset.locked) return;
        td.textContent = lowerScores[id] !== '' ? lowerScores[id] : '';
        td.style.color = lowerScores[id] !== '' ? 'red' : '';
    });

    const yahtzeeScore = document.getElementById('yahtzee-score').dataset.locked === 'true';
    if (yahtzeeScore && allDice.length===5 && new Set(allDice).size===1) {
        yahtzeeBonus += 100; 
    }
    document.getElementById('yahtzee-bonus-score').textContent = yahtzeeBonus;

    const lowerScoreCells = ['three-kind-score','four-kind-score','full-house-score','small-straight-score','large-straight-score','yahtzee-score','chance-score'];
    const lowerTotal = lowerScoreCells.reduce((sum,id)=>{
        const val = parseInt(document.getElementById(id).textContent) || 0;
        return sum + val;
    },0) + yahtzeeBonus;
    document.getElementById('total-lower-score').textContent = lowerTotal;
}

function sumIfKind(dice, countNeeded) {
    if (dice.length < 5) return '';
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    for (let value in counts) {
        if (counts[value] >= countNeeded) return dice.reduce((a,b)=>a+b,0);
    }
    return '';
}

function isFullHouse(dice) {
    if(dice.length!==5) return false;
    const counts = {};
    dice.forEach(d => counts[d]=(counts[d]||0)+1);
    const values = Object.values(counts);
    return values.includes(3) && values.includes(2);
}

function hasSmallStraight(dice) {
    if(dice.length<4) return false;
    const unique = [...new Set(dice)].sort((a,b)=>a-b);
    const straights = [[1,2,3,4],[2,3,4,5],[3,4,5,6]];
    return straights.some(straight => straight.every(num=>unique.includes(num)));
}

function hasLargeStraight(dice) {
    if(dice.length!==5) return false;
    const sorted = [...new Set(dice)].sort((a,b)=>a-b).join('');
    return sorted==='12345'||sorted==='23456';
}

document.querySelectorAll('#upper-table td, #lower-table td').forEach(td => {
    td.addEventListener('click', ()=>{
        if(td.dataset.locked) return;
        if(td.textContent==='') {
            if(confirm('No dice for this category. Set to 0?')) td.textContent=0;
            else return;
        }
        td.style.color='black';
        td.dataset.locked='true';

        document.getElementById('roll-count').textContent=3;
        rollButton.disabled=false;
        document.querySelectorAll('.playdice, .keepDice').forEach(d=>{
            d.innerHTML='';
            d.style.display='block';
        });

        totalTurns++;
        calculatePotentialScores();

        if(totalTurns>=13){
            rollButton.disabled=true;
            const finalScore = parseInt(document.getElementById('total-upper-score').textContent) +
                               parseInt(document.getElementById('total-lower-score').textContent);
            document.getElementById('final-score-value').textContent = finalScore;
        }
    });
});