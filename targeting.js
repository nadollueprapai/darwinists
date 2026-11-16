function getTargetCollection(card) {
    const collections = {
        hand: card.owner.hand,
        active: card.owner.activeCards,
        deck: card.owner.deck,
        destroyed: card.owner.destroyedCards
    };

    const collection = collections[card.zone];

    if (!collection) {
        console.warn("Unknown card zone:", card.zone);
        return null;
    }

    return collection;
}

function removeTarget(card) {
    const collection = getTargetCollection(card);

    if (!collection) return false;

    const index = collection.findIndex(
        existingCard => existingCard.instanceId === card.instanceId
    );

    if (index === -1) return false;

    collection.splice(index, 1);

    return true;
}

function moveTarget(card, destination, reason = null) {

    const sourceCollection = getTargetCollection(card);

    if (!sourceCollection) return false;

    const destinations = {
        hand: card.owner.hand,
        active: card.owner.activeCards,
        deck: card.owner.deck,
        destroyed: card.owner.destroyedCards
    };

    const destinationCollection = destinations[destination];

    if (!destinationCollection) {
        console.warn("Unknown destination zone:", destination);
        return false;
    }

    if (card.zone === destination) return false;

    const index = sourceCollection.findIndex(
        existingCard => existingCard.instanceId === card.instanceId
    );

    if (index === -1) return false;

    // Move card.
    const [movedCard] = sourceCollection.splice(index, 1);

    destinationCollection.push(movedCard);

    // Update zone.
    movedCard.zone = destination;

    // Prepare effect context.
    const context = {
        owner: movedCard.owner,
        opponent: getOpponent(movedCard.owner),
        sourceCard: movedCard
    };

    // Trigger destination-related effects.
    if (destination === "hand" && reason === "draw") {
        runCardEffects(movedCard, "on_draw", context);
    }

    if (destination === "active" && reason === "play") {
        runCardEffects(movedCard, "on_play", context);
    }

    if (destination === "destroyed" && reason === "destroy") {
        runCardEffects(movedCard, "on_destroy", context);
    }

    return true;
}

function selectTargets(config, context) {
    const { owner, opponent } = context;

    const {
        owner: ownerSelector = "enemy",
        zones = ["active"],
        selection = "random",
        count = 1
    } = config;

    // ==============================================
    // DETERMINE WHICH OWNERS TO SEARCH
    // ==============================================

    let owners = [];

    switch (ownerSelector) {

        case "self":
            owners = [owner];
            break;

        case "enemy":
            owners = [opponent];
            break;

        case "both":
            owners = [owner, opponent];
            break;

        default:
            console.warn("Unknown target owner:", ownerSelector);
            return [];

    }


    // ==============================================
    // COLLECT CANDIDATES FROM EACH ZONE
    // ==============================================

    const candidates = [];

    for (const side of owners) {

        for (const zone of zones) {

            let zoneCards;

            switch (zone) {

                case "hand":
                    zoneCards = side.hand;
                    break;

                case "active":
                    zoneCards = side.activeCards;
                    break;

                case "deck":
                    zoneCards = side.deck;
                    break;

                case "destroyed":
                    zoneCards = side.destroyedCards;
                    break;

                default:
                    console.warn("Unknown target zone:", zone);
                    continue;

            }

            for (const card of zoneCards) {

                candidates.push(card);

            }

        }

    }


    // ==============================================
    // HANDLE SELECTION
    // ==============================================

    if (selection === "all") {
        return candidates;
    }

    const targetCount = Math.max(
        1,
        Number.isInteger(count) ? count : 1
    );


    // Select random unique candidates.
    function selectRandom(items, amount) {

        const available = [...items];
        const selected = [];

        while (selected.length < amount && available.length > 0) {

            const index = Math.floor(
                Math.random() * available.length
            );

            selected.push(
                available.splice(index, 1)[0]
            );

        }

        return selected;

    }


    if (selection === "random") {
        return selectRandom(candidates, targetCount);
    }


    // ==============================================
    // HANDLE POWER-BASED SELECTION
    // ==============================================

    if (
        selection === "highest_power" ||
        selection === "lowest_power"
    ) {

        const groups = new Map();

        for (const candidate of candidates) {

            const power = getPower(
                candidate,
                candidate.owner
            );

            if (!groups.has(power)) {
                groups.set(power, []);
            }

            groups.get(power).push(candidate);

        }

        const powers = [...groups.keys()].sort(
            (a, b) => selection === "highest_power"
                ? b - a
                : a - b
        );

        const selected = [];

        for (const power of powers) {

            const group = groups.get(power);

            const remaining = targetCount - selected.length;

            if (group.length <= remaining) {

                selected.push(...group);

            } else {

                selected.push(
                    ...selectRandom(group, remaining)
                );

            }

            if (selected.length >= targetCount) {
                break;
            }

        }
        console.log("Selected targets based on power:", selected);
        return selected;

    }

    if (selection === "top") {
        return [candidates.slice(0, targetCount).at(0)];

    }

    else if (selection === "bottom") {

        return [candidates.slice(-targetCount).reverse().at(0)];

    }


    console.warn("Unknown target selection:", selection);
    return [];

}