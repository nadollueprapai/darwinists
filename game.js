// ==================================================
// GLOBAL VARIABLES
// ==================================================

let nextInstanceId = 1;
let state = null;

const STARTING_HAND_SIZE = 3;
const MAX_TURNS = 5;

// ==================================================
// HTML REFERENCES
// ==================================================

const elements = {

    startButton: document.getElementById("start-button"),
    gameArea: document.getElementById("game-area"),

    turnValue: document.getElementById("turn-value"),
    energyValue: document.getElementById("energy-value"),
    deckValue: document.getElementById("deck-value"),

    handCount: document.getElementById("hand-count"),
    enemyDeckValue: document.getElementById("enemy-deck-value"),
    enemyHandCount: document.getElementById("enemy-hand-count"),

    message: document.getElementById("message"),

    playerScore: document.getElementById("player-score"),
    enemyScore: document.getElementById("enemy-score"),

    playerBoard: document.getElementById("player-board"),
    enemyBoard: document.getElementById("enemy-board"),

    playerHand: document.getElementById("player-hand"),
    handHelp: document.getElementById("hand-help"),

    endTurnButton: document.getElementById("end-turn-button"),

    battleLog: document.getElementById("battle-log")

};


// ==================================================
// DECK FUNCTIONS
// ==================================================


function createCardInstance(definition) {
    return {
        instanceId: nextInstanceId++,

        id: definition.id,
        name: definition.name,

        cost: definition.cost,

        basePower: definition.power,

        // Temporary power changes are stored here.
        powerModifier: 0,

        description: definition.description,

        effects: (definition.effects || []).map(
            effect => ({ ...effect })
        )

    };

}


function shuffle(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];

    }

    return result;

}

function createStarterDeck() {
    return shuffle(
        Object.keys(CARDS).flatMap(cardId => [
            createCardInstance(CARDS[cardId]),
        ])
    );
}

function createSide(name) {
    return {
        name,

        deck: createStarterDeck(),

        hand: [],
        activeCards: [],
        destroyedCards: [],
        energy: 0
    };
}

function drawCards(owner, amount) {

    for (let i = 0; i < amount; i++) {

        if (owner.deck.length === 0) {
            break;
        }

        const card = owner.deck.pop();

        owner.hand.push(card);

    }

}

// ==================================================
// PLAYER AND OPPONENT REFERENCES
// ==================================================

function getOpponent(owner) {

    return owner === state.player
        ? state.enemy
        : state.player;

}


// ==================================================
// LOGGING AND MESSAGES
// ==================================================

function log(message) {

    state.log.push(message);

    if (state.log.length > 50) {
        state.log.shift();
    }

}


function setMessage(message) {

    state.message = message;

}


// ==================================================
// START BATTLE
// ==================================================

function createBattle() {
    nextInstanceId = 1;

    state = {

        turn: 1,

        maxTurns: MAX_TURNS,

        phase: "player",

        status: "playing",

        message: "Your turn. Play cards, then end your turn.",

        player: createSide("You"),

        enemy: createSide("Opponent"),

        stats: {
            playerCardsPlayed: 0,
            enemyCardsPlayed: 0,
            totalCardsPlayed: 0
        },

        playOrder: [],

        log: []
        
    };


    // Both players draw their starting hands.
    for (let i = 0; i < STARTING_HAND_SIZE; i++) {

        drawCards(state.player, 1);

        drawCards(state.enemy, 1);

    }


    // Turn 1 starts with 1 energy.
    state.player.energy = 1;

    state.enemy.energy = 1;


    log("Battle started. Both sides drew 3 cards.");

    runActiveTrigger("on_turn_start");

    setMessage("Turn 1: You have 1 energy. Select a card to play.");


    elements.gameArea.classList.remove("hidden");

    elements.startButton.textContent = "Restart Battle";


    render();

}


// ==================================================
// PLAY CARD
// ==================================================

function playCard(owner, handIndex) {

    const card = owner.hand[handIndex];

    if (!card) return false;

    if (state.status !== "playing") return false;

    if (owner.energy < card.cost) return false;


    if (owner === state.player && state.phase !== "player") {
        return false;
    }

    if (owner === state.enemy && state.phase !== "enemy") {
        return false;
    }


    // Remove card from hand.
    owner.hand.splice(handIndex, 1);


    // Pay energy cost.
    owner.energy -= card.cost;


    // Add card to active board.
    owner.activeCards.push(card);

    state.playOrder.push({
        card,
        owner
    });

    if (owner === state.player) {
        state.stats.playerCardsPlayed++;
    } else {
        state.stats.enemyCardsPlayed++;
    }

    state.stats.totalCardsPlayed++;


    log(
        `${owner.name} played ${card.name} (cost ${card.cost}, power ${card.basePower}).`
    );


    // Activate the card's own on_play effects.
    runCardEffects(card, "on_play", {

        owner,

        opponent: getOpponent(owner),

        sourceCard: card

    });


    // Notify other active cards that a card was played.
    notifyCardPlayed(card, owner);


    return true;

}


// ==================================================
// AI CARD SELECTION
// ==================================================

function chooseEnemyCard() {

    const affordable = state.enemy.hand

        .map((card, index) => ({ card, index }))

        .filter(
            entry => entry.card.cost <= state.enemy.energy
        );


    if (affordable.length === 0) {
        return null;
    }


    const effectValue = {

        destroy_card: 5,

        transfer_power: 4,

        draw_cards: 3,

        reduce_power: 3,

        scale_power: 2

    };


    affordable.sort((a, b) => {

        function getScore(entry) {

            const bonus = entry.card.effects.reduce(
                (sum, effect) => sum + (effectValue[effect.type] || 0),
                0
            );

            return (
                (entry.card.basePower + bonus) /
                Math.max(1, entry.card.cost)
            );

        }

        return getScore(b) - getScore(a);

    });


    // Pick randomly between the two best options.
    const topChoices = affordable.slice(
        0,
        Math.min(2, affordable.length)
    );

    return randomItem(topChoices);

}


// ==================================================
// ENEMY TURN
// ==================================================

function enemyTurn() {

    state.phase = "enemy";

    setMessage("Opponent's turn...");

    render();


    let safetyCounter = 0;


    while (state.enemy.energy > 0 && safetyCounter < 50) {

        const choice = chooseEnemyCard();

        if (!choice) {
            break;
        }

        if (!playCard(state.enemy, choice.index)) {
            break;
        }

        safetyCounter++;

    }

    
    log("Opponent ended its turn.");


    // Effects that happen at the end of the round.
    runActiveTrigger("on_turn_end");


    // Check whether the battle is over.
    if (state.turn >= state.maxTurns) {

        finishBattle();

        return;

    }


    // Start the next turn.
    state.turn++;


    // Energy equals the turn number.
    state.player.energy = state.turn;

    state.enemy.energy = state.turn;


    // Draw one card for each side.
    drawCards(state.player, 1);

    drawCards(state.enemy, 1);


    state.phase = "player";


    runActiveTrigger("on_turn_start");


    setMessage(
        `Turn ${state.turn}: You have ${state.player.energy} energy. Select a card to play.`
    );


    render();

}


// ==================================================
// END PLAYER TURN
// ==================================================

function endPlayerTurn() {

    if (!state) return;

    if (state.status !== "playing") return;

    if (state.phase !== "player") return;


    state.phase = "enemy";

    setMessage("Opponent's turn...");

    log("You ended your turn.");

    render();


    enemyTurn();

}


// ==================================================
// FINISH BATTLE
// ==================================================

function finishBattle() {

    state.status = "finished";

    state.phase = "finished";


    const playerPower = getTotalPower(state.player);

    const enemyPower = getTotalPower(state.enemy);


    let result;


    if (playerPower > enemyPower) {

        result = "You win!";

    } else if (enemyPower > playerPower) {

        result = "Opponent wins.";

    } else {

        result = "The battle is a draw.";

    }


    setMessage(
        `${result} Final score: You ${playerPower} — Opponent ${enemyPower}.`
    );


    log(
        `Battle finished. ${result} Final score: ${playerPower} to ${enemyPower}.`
    );


    elements.startButton.textContent = "Play Again";


    render();

}


// ==================================================
// HTML SAFETY
// ==================================================

function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


// ==================================================
// CARD DISPLAY
// ==================================================

function cardMarkup(card, owner, options = {}) {

    const power = getPower(card, owner);

    const cardClass = options.playable
        ? "card playable"
        : "card";


    const disabled = options.disabled
        ? "disabled"
        : "";


    const buttonStart = options.playable

        ? `<button
                type="button"
                class="${cardClass}"
                data-card-index="${options.index}"
                ${disabled}
            >`

        : `<div class="${cardClass}">`;


    const buttonEnd = options.playable
        ? "</button>"
        : "</div>";


    return `

        ${buttonStart}

            <span class="card-id">
                ${escapeHtml(card.id)}
            </span>

            <span class="card-name">
                ${escapeHtml(card.name)}
            </span>

            <span class="card-description">
                ${escapeHtml(card.quote || "\"-\"")}
            </span>

            <span class="card-description">
                ${escapeHtml(card.description)}
            </span>

            <span class="card-stats">

                <div>${card.cost} DNA</div>
            
                <span>BP: ${card.basePower}</span>
            
                <strong>AP: ${power}</strong>
            
            </span>

        ${buttonEnd}

    `;

}


// ==================================================
// RENDER BATTLE BOARDS
// ==================================================

function renderBoard(owner, container) {

    if (owner.activeCards.length === 0) {

        container.innerHTML = `
            <p class="empty-state">
                No traits played yet.
            </p>
        `;

        return;

    }


    container.innerHTML = owner.activeCards

        .map(card => cardMarkup(card, owner))

        .join("");

}


// ==================================================
// RENDER PLAYER HAND
// ==================================================

function renderHand() {

    const canPlay = (
        state.status === "playing" &&
        state.phase === "player"
    );


    if (state.player.hand.length === 0) {

        elements.playerHand.innerHTML = `
            <p class="empty-state">
                Your hand is empty.
            </p>
        `;

        return;

    }


    elements.playerHand.innerHTML = state.player.hand

        .map((card, index) => {

            const disabled = (
                !canPlay ||
                card.cost > state.player.energy
            );


            return cardMarkup(card, state.player, {

                playable: true,

                disabled,

                index

            });

        })

        .join("");

}


// ==================================================
// RENDER BATTLE LOG
// ==================================================

function renderLog() {

    elements.battleLog.innerHTML = state.log

        .map(message => `<li>${escapeHtml(message)}</li>`)

        .join("");


    elements.battleLog.scrollTop =
        elements.battleLog.scrollHeight;

}


// ==================================================
// RENDER EVERYTHING
// ==================================================

function render() {

    if (!state) return;


    elements.turnValue.textContent =
        `${state.turn} / ${state.maxTurns}`;


    elements.energyValue.textContent =
        String(state.player.energy);


    elements.deckValue.textContent =
        String(state.player.deck.length);


    elements.handCount.textContent =
        String(state.player.hand.length);


    elements.enemyHandCount.textContent =
        String(state.enemy.hand.length);


    elements.enemyDeckValue.textContent =
        String(state.enemy.deck.length);


    elements.playerScore.textContent =
        String(getTotalPower(state.player));


    elements.enemyScore.textContent =
        String(getTotalPower(state.enemy));


    elements.message.textContent =
        state.message;


    elements.handHelp.textContent =

        state.status === "finished"

            ? "The battle is over."

            : state.phase === "player"

                ? "Select an affordable card to play."

                : "Waiting for the opponent...";


    renderBoard(state.player, elements.playerBoard);

    renderBoard(state.enemy, elements.enemyBoard);

    renderHand();

    renderLog();


    elements.endTurnButton.disabled = (

        state.status !== "playing" ||
        state.phase !== "player"

    );


    elements.endTurnButton.textContent =

        state.status === "finished"
            ? "Battle Finished"
            : "End Turn";

}


// ==================================================
// EVENT LISTENERS
// ==================================================

elements.startButton.addEventListener(
    "click",
    createBattle
);


elements.endTurnButton.addEventListener(
    "click",
    endPlayerTurn
);


elements.playerHand.addEventListener(
    "click",
    event => {

        const button = event.target.closest(
            "button[data-card-index]"
        );

        if (!button) return;

        if (!state) return;

        if (state.status !== "playing") return;

        if (state.phase !== "player") return;


        const index = Number(button.dataset.cardIndex);


        if (!Number.isInteger(index)) return;


        if (playCard(state.player, index)) {

            setMessage(
                `You played a card. You have ${state.player.energy} energy remaining.`
            );

            render();

        }

    }
);