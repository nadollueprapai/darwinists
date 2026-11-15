
const CARDS = {
    scutes: {
        id: "scutes",
        name: "Scutes",
        cost: 1,
        power: 2,
        description: "A simple defensive covering."
    },

    claws: {
        id: "claws",
        name: "Claws",
        cost: 1,
        power: 3,
        description: "A cheap trait with reliable power."
    },

    feathers: {
        id: "feathers",
        name: "Feathers",
        cost: 2,
        power: 2,
        description: "Draw 1 card when played.",

        effects: [
            {
                trigger: "on_play",
                type: "draw_cards",
                amount: 1
            }
        ]
    },

    fangs: {
        id: "fangs",
        name: "Fangs",
        cost: 2,
        power: 4,
        description: "A straightforward offensive trait."
    },

    thick_hide: {
        id: "thick_hide",
        name: "Thick Hide",
        cost: 2,
        power: 3,
        description: "This card's power cannot be reduced.",

        effects: [
            {
                trigger: "ongoing",
                type: "power_protection",
                target: "self"
            }
        ]
    },

    regeneration: {
        id: "regeneration",
        name: "Regeneration",
        cost: 2,
        power: 3,
        description: "End of turn: Restore 1 lost power to all your cards in play.",

        effects: [
            {
                trigger: "on_turn_end",
                type: "heal_power",
                target: {
                    owner: "self",
                    zones: ["active"],
                    selection: "all"
                },
                amount: 1
            }
        ]
    },

    venom: {
        id: "venom",
        name: "Venom",
        cost: 2,
        power: 3,
        description: "On play: Reduce the highest enemy card's power by 2.",

        effects: [
            {
                trigger: "on_play",
                type: "reduce_power",
                target: {
                    owner: "enemy",
                    zones: ["active"],
                    selection: "highest_power",
                    count: 1
                },
                amount: 2
            }
        ]
    },

    thagomizer: {
        id: "thagomizer",
        name: "Thagomizer",
        cost: 3,
        power: 4,
        description: "On play: Steal 2 power from the highest enemy card.",

        effects: [
            {
                trigger: "on_play",
                type: "transfer_power",
                target: {
                    owner: "enemy",
                    zones: ["active"],
                    selection: "highest_power",
                    count: 1
                },
                amount: 2
            }
        ]
    },

    intestines: {
        id: "intestines",
        name: "Intestines",
        cost: 1,
        power: 0,
        description: "Ongoing: Gain 1 power for each other card you played.",

            effects: [
        {
            trigger: "ongoing",
            type: "scale_power",
            amount: 1,

            countTargets: {
                owner: "self",
                zones: ["active"],
                selection: "all"
            },

            excludeSelf: true
        }
    ]
    },

    armored_skull: {
        id: "armored_skull",
        name: "Armored Skull",
        cost: 3,
        power: 4,
        description: "This card cannot be destroyed.",

        effects: [
            {
                trigger: "ongoing",
                type: "destruction_protection",
                target: "self"
            }
        ]
    },

    parasite: {
        id: "parasite",
        name: "Parasite",
        cost: 4,
        power: 3,
        description: "On play:Destroy a random unprotected enemy card.",

        effects: [
            {
                trigger: "on_play",
                type: "destroy_card",
                target: {
                    owner: "enemy",
                    zones: ["active"],
                    selection: "random",
                    count: 1
                }
            }
        ]
    },

    theropod: {
        id: "theropod",
        name: "Theropod",
        cost: 4,
        power: 7,
        description: "A powerful trait with no additional effect."
    },

    adaptive_brain: {
        id: "adaptive_brain",
        name: "Adaptive Brain",
        cost: 4,
        power: 4,
        description: "On play: Draw 2 cards when played.",

        effects: [
            {
                trigger: "on_play",
                type: "draw_cards",
                amount: 2
            }
        ]
    },

    brain_plus_ultra: {
        id: "brain_plus_ultra",
        name: "Brain Plus Ultra",
        cost: 1,
        power: 0,
        description: "Ongoing: Has power equal to the number of cards in both decks.",

        effects: [
            {
                trigger: "ongoing",
                type: "scale_power",
                amount: 1,
                countTargets: {
                    owner: "both",
                    zones: ["deck"],
                    selection: "all"
                },
                excludeSelf: false
            }
        ]
    },

    apex: {
        id: "apex",
        name: "Apex",
        cost: 5,
        power: 0,
        description: "Ongoing: 3 power for all cards in play.",
        effects: [
        {
            trigger: "ongoing",
            type: "scale_power",
            amount: 3,

            countTargets: {
                owner: "both",
                zones: ["active"],
                selection: "all"
            },

            excludeSelf: false
        }
    ]
    },
};