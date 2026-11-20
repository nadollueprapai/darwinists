// ==================================================
// POWER CALCULATION
// ==================================================
function getScaleCount(effect, card, owner) {
    switch (effect.scaleType) {
        case "target_count": {
            const targets = selectTargets(
                effect.countTargets,
                {
                    owner,
                    opponent: getOpponent(owner)
                }
            );
            return targets.filter(target =>
                !effect.excludeSelf ||
                target.instanceId !== card.instanceId
            ).length;
        }
        case "target_power": {
            const targets = selectTargets(
                effect.countTargets,
                {
                    owner,
                    opponent: getOpponent(owner)
                }
            );

            const filteredTargets = targets.filter(target =>
                !effect.excludeSelf ||
                target.instanceId !== card.instanceId
            );

            return filteredTargets.reduce(
                (total, target) =>
                    total + getBaseCalculatedPower(target),
                0
            );
        }
        case "stat_count": {
            const stat = state.stats[effect.stat];
            if (typeof stat !== "number") {
                console.warn(
                    "Unknown scaling statistic:",
                    effect.stat
                );
                return 0;
            }

            return stat;
        }
        default:
            console.warn(
                "Unknown scaling type:",
                effect.scaleType
            );
            return 0;
    }
}

function getBaseCalculatedPower(card) {
    let power = card.basePower + card.powerModifier;

    if (hasProtection(card, "power_protection")) {
        return Math.max(card.basePower, power);
    }

    power += card.powerBoost;

    return Math.max(0, power);
}

function getPower(card, owner) {
    let power = getBaseCalculatedPower(card);

    for (const effect of card.effects) {
        if (
            effect.trigger === "ongoing" &&
            effect.type === "scale_power"
        ) {
            const count = getScaleCount(effect, card, owner);
            power += effect.amount * count;
        }
    }

    return power;
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

function hasProtection(card, protectionType) {
    const protectionEffects = []
    
    card.owner.activeCards.forEach(activeCard => {
        protectionEffects.push(...activeCard.effects.filter(effect =>
        effect.trigger === "ongoing" &&
        effect.type === protectionType));
    });

    for (const effect of protectionEffects) {

        const protectedCards = selectTargets(
            effect.target,
            {
                owner: card.owner,
                opponent: getOpponent(card.owner)
            }
        );

        if (protectedCards.includes(card)) {
            return true;
        }

    }

    return false;
}

function isProtectedFromReduction(card) {
    return hasProtection(card, "power_protection");
}

function isProtectedFromDestruction(card) {
    return hasProtection(card, "destruction_protection");
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


    moveTarget(target, "destroyed", "destroy");


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

    const targets = selectTargets(effect.target, context);

    for (const target of targets) {

        if (isProtectedFromReduction(target)) {
            log(`${target.name} resisted the power reduction.`);
            continue;
        } else {
            log(`${target.name} does not have power reduction protection.`)
        }

        const amount = Math.min(
            effect.amount,
            getPower(target, target.owner)
        );

        target.powerModifier -= amount;

        log(`${target.name} lost ${amount} power because of ${sourceCard.name}.`);
    }
}

// ------------------------------------------
// TRANSFER POWER
// ------------------------------------------

function effectTransferPower(effect, sourceCard, context) {

    const targets = selectTargets(effect.target, context);

    const target = targets[0];

    if (!target) {
        log(`${sourceCard.name} had no valid card to steal power from.`);
        return;
    }

    if (isProtectedFromReduction(target)) {
        log(`${target.name} resisted the power steal.`);
        return;
    }

    const amount = Math.min(
        effect.amount,
        getPower(target, target.owner)
    );

    target.powerModifier -= amount;
    sourceCard.powerModifier += amount;

    log(`${sourceCard.name} stole ${amount} power from ${target.name}.`);
}


// ------------------------------------------
// DESTROY CARD
// ------------------------------------------

function effectDestroyCard(effect, sourceCard, context) {

    const targets = selectTargets(effect.target, context);

    const target = targets[0];

    if (!target) {
        log(`${sourceCard.name} had no valid card to destroy.`);
        return;
    }

    if (target.zone !== "active") {
        log(`${target.name} cannot be destroyed from this zone yet.`);
        return;
    }

    if (isProtectedFromDestruction(target)) {
        log(`${target.name} cannot be destroyed.`);
        return;
    }

    moveTarget(target, "destroyed", "destroy");

    log(`${target.name} was destroyed.`);
}

// ------------------------------------------
// HEAL POWER
// ------------------------------------------

function effectHealPower(effect, sourceCard, context) {

    const targets = selectTargets(effect.target, context);

    for (const target of targets) {

        const currentPower = getPower(target, target.owner);

        const missingPower = Math.max(
            0,
            target.basePower - currentPower
        );

        const healed = Math.min(
            effect.amount,
            missingPower
        );

        if (healed <= 0) {
            log(`${target.name} has no power to restore.`);
            continue;
        }

        target.powerModifier += healed;

        log(`${target.name} recovered ${healed} power.`);
    }
}

function effectAddCards(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    for (const target of targets) {

        moveTarget(target, "active", "added");

    }

}

function effectSummonCards(effect, sourceCard, context) {

    function summonCard(cardId, owner) {

        const definition = CARDS[cardId];

        if (!definition) {
            console.warn("Unknown card ID:", cardId);
            return false;
        }

        const card = createCardInstance(definition, owner, "active");

        owner.activeCards.push(card);

        state.playOrder.push({
            card,
            owner
        });

        log(`${card.name} was summoned.`);


        // Trigger on-play effects.
        runCardEffects(card, "on_play", {
            owner,
            opponent: getOpponent(owner),
            sourceCard: card
        });

        notifyCardPlayed(card, owner);

        return true;

    }


    const { owner } = context;


    if (effect.source === "specific") {

        for (const cardId of effect.cards || []) {

            summonCard(cardId, owner);

        }

    }


    else if (effect.source === "target") {

        const targets = selectTargets(
            effect.target,
            context
        );

        for (const target of targets) {

            summonCard(target.card.id, target.owner);

        }

    }

}

function effectAddPower(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    for (const target of targets) {

        target.powerModifier += effect.amount;

        log(`${target.name} gained ${effect.amount} power.`);

    }

}

function effectBoostPower(effect, sourceCard, context) {

    const targets = selectTargets(
        effect.target,
        context
    );

    for (const target of targets) {

        if (
            effect.excludeSelf &&
            target.instanceId === sourceCard.instanceId
        ) {
            continue;
        }

        target.powerModifier += effect.amount;

        log(`${target.name} gained ${effect.amount} temporary power.`);

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
    heal_power: effectHealPower,
    add_cards: effectAddCards,
    summon_cards: effectSummonCards,
    add_power: effectAddPower,
    boost_power: effectBoostPower
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
