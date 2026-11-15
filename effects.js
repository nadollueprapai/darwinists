// ==================================================
// POWER CALCULATION
// ==================================================
function getScaleCount(effect, card, owner) {

    const targets = selectTargets(
        effect.countTargets,
        {
            owner,
            opponent: owner === state.player
                ? state.enemy
                : state.player
        }
    );
    return targets.filter(target =>
        !effect.excludeSelf ||
        target.card.instanceId !== card.instanceId
    ).length;

}

function getPower(card, owner) {
    let power = card.basePower + card.powerModifier;

    for (const effect of card.effects) {

        if (
            effect.trigger === "ongoing" &&
            effect.type === "scale_power"
        ) {

            const count = getScaleCount(effect, card, owner);

            power += effect.amount * count;

        }

    }
    return Math.max(0, power);

}

function getTotalPower(owner) {

    return owner.activeCards.reduce(
        (total, card) => total + getPower(card, owner),
        0
    );

}


// ==================================================
// PROTECTION CHECKS
// ==================================================

function hasSelfProtection(card, protectionType) {

    return card.effects.some(effect =>

        effect.trigger === "ongoing" &&

        effect.type === protectionType &&

        (!effect.target || effect.target === "self")

    );

}


function hasTeamProtection(owner, protectionType) {

    return owner.activeCards.some(card =>

        card.effects.some(effect =>

            effect.trigger === "ongoing" &&

            effect.type === protectionType &&

            effect.target === "all_own"

        )

    );

}


function isProtectedFromReduction(card, owner) {

    return (
        hasSelfProtection(card, "power_protection") ||
        hasTeamProtection(owner, "power_protection")
    );

}


function isProtectedFromDestruction(card, owner) {

    return (
        hasSelfProtection(card, "destruction_protection") ||
        hasTeamProtection(owner, "destruction_protection")
    );

}




// ==================================================
// TARGET SELECTION
// ==================================================

function randomItem(array) {

    if (array.length === 0) {
        return null;
    }

    return array[Math.floor(Math.random() * array.length)];

}

// ==================================================
// EFFECT EXECUTION
// ==================================================

function removeActiveCard(owner, target) {

    const index = owner.activeCards.findIndex(
        card => card.instanceId === target.instanceId
    );

    if (index === -1) {
        return false;
    }

    owner.destroyedCards.push(owner.activeCards.splice(index, 1)[0]);

    return true;

}




// ==================================================
// EFFECT HANDLERS
// ==================================================


// ------------------------------------------
// DRAW CARDS
// ------------------------------------------

function effectDrawCards(effect, sourceCard, context) {

    const { owner } = context;

    drawCards(owner, effect.amount);

}


// ------------------------------------------
// REDUCE POWER
// ------------------------------------------

function effectReducePower(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    for (const target of targets) {

        const { card, owner: targetOwner } = target;

        if (isProtectedFromReduction(card, targetOwner)) {
            log(`${card.name} resisted the power reduction.`);
            continue;
        }

        const amount = Math.min(
            effect.amount,
            getPower(card, targetOwner)
        );

        card.powerModifier -= amount;

        log(`${card.name} lost ${amount} power.`);

    }

}


// ------------------------------------------
// TRANSFER POWER
// ------------------------------------------

function effectTransferPower(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    const target = targets[0];

    if (!target) {
        log(`${sourceCard.name} had no valid card to steal power from.`);
        return;
    }

    const { card, owner: targetOwner } = target;

    if (isProtectedFromReduction(card, targetOwner)) {
        log(`${card.name} resisted the power steal.`);
        return;
    }

    const amount = Math.min(
        effect.amount,
        getPower(card, targetOwner)
    );

    card.powerModifier -= amount;
    sourceCard.powerModifier += amount;

    log(`${sourceCard.name} stole ${amount} power from ${card.name}.`);

}


// ------------------------------------------
// DESTROY CARD
// ------------------------------------------

function effectDestroyCard(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    const target = targets[0];

    if (!target) {
        log(`${sourceCard.name} had no valid card to destroy.`);
        return;
    }

    const { card, owner: targetOwner, zone } = target;

    if (zone !== "active") {
        log(`${card.name} cannot be destroyed from this zone yet.`);
        return;
    }

    if (isProtectedFromDestruction(card, targetOwner)) {
        log(`${card.name} cannot be destroyed.`);
        return;
    }

    removeActiveCard(targetOwner, card);

    log(`${card.name} was destroyed.`);

}


// ------------------------------------------
// HEAL POWER
// ------------------------------------------

function effectHealPower(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    for (const target of targets) {

        const { card, owner: targetOwner } = target;

        const currentPower = getPower(card, targetOwner);

        const missingPower = Math.max(
            0,
            card.basePower - currentPower
        );

        const healed = Math.min(
            effect.amount,
            missingPower
        );

        if (healed <= 0) {
            log(`${card.name} has no power to restore.`);
            continue;
        }

        card.powerModifier += healed;

        log(`${card.name} recovered ${healed} power.`);

    }

}


// ==================================================
// EFFECT REGISTRY
// ==================================================

const EFFECT_HANDLERS = {

    draw_cards: effectDrawCards,
    reduce_power: effectReducePower,
    transfer_power: effectTransferPower,
    destroy_card: effectDestroyCard,
    heal_power: effectHealPower

};


// ==================================================
// EFFECT DISPATCHER
// ==================================================

function runEffect(effect, sourceCard, context) {

    const handler = EFFECT_HANDLERS[effect.type];

    if (!handler) {
        console.warn("Unknown effect type:", effect.type);
        return;
    }

    return handler(effect, sourceCard, context);

}



// ==================================================
// EFFECT EXECUTION
// ==================================================

function runCardEffects(card, trigger, context) {

    for (const effect of card.effects) {

        if (effect.trigger === trigger) {

            runEffect(effect, card, context);

        }

    }

}

function runActiveTrigger(trigger) {

    const cardsAtStart = [...state.playOrder];

    for (const entry of cardsAtStart) {

        const { card, owner } = entry;

        // Destroyed cards cannot trigger effects.
        if (
            !owner.activeCards.some(
                active => active.instanceId === card.instanceId
            )
        ) {
            continue;
        }

        const opponent = getOpponent(owner);

        runCardEffects(card, trigger, {
            owner,
            opponent,
            sourceCard: card
        });

    }

}

function notifyCardPlayed(playedCard, playedBy) {

    for (const owner of [state.player, state.enemy]) {

        const opponent = getOpponent(owner);

        const cardsAtStart = [...owner.activeCards];

        for (const card of cardsAtStart) {

            // A card does not trigger on its own play notification.
            if (card.instanceId === playedCard.instanceId) {
                continue;
            }

            if (
                !owner.activeCards.some(
                    active => active.instanceId === card.instanceId
                )
            ) {
                continue;
            }

            runCardEffects(card, "on_card_played", {

                owner,
                opponent,

                sourceCard: card,

                playedCard,
                playedBy

            });

        }

    }

}
