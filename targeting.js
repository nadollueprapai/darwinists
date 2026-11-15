function getTargetCollection(target) {

    const { owner, zone } = target;

    switch (zone) {

        case "hand":
            return owner.hand;

        case "active":
            return owner.activeCards;

        case "deck":
            return owner.deck;

        case "destroyed":
            return owner.destroyedCards;

        default:
            console.warn("Unknown target zone:", zone);
            return null;

    }

}

function removeTarget(target) {

    const collection = getTargetCollection(target);

    if (!collection) return false;

    const index = collection.findIndex(
        card => card.instanceId === target.card.instanceId
    );

    if (index === -1) return false;

    collection.splice(index, 1);

    return true;

}

function moveTarget(target, destination) {

    const sourceCollection = getTargetCollection(target);

    if (!sourceCollection) return false;

    const destinations = {
        hand: target.owner.hand,
        active: target.owner.activeCards,
        deck: target.owner.deck,
        destroyed: target.owner.destroyedCards
    };

    const destinationCollection = destinations[destination];

    if (!destinationCollection) {
        console.warn("Unknown destination zone:", destination);
        return false;
    }

    if (target.zone === destination) return false;

    const index = sourceCollection.findIndex(
        card => card.instanceId === target.card.instanceId
    );

    if (index === -1) return false;

    const [card] = sourceCollection.splice(index, 1);

    destinationCollection.push(card);

    target.zone = destination;

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

                candidates.push({
                    card,
                    owner: side,
                    zone
                });

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
                candidate.card,
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

        return selected;

    }


    console.warn("Unknown target selection:", selection);
    return [];

}