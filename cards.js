
const CARDS = {
    scutes: {
        id: "scutes",
        name: "Scutes",
        cost: 1,
        power: 2,
        quote: "Maybe one day I'll have a shell, but for now this will have to do."
    },

    bipedalism: {
        id: "bipedalism",
        name: "Bipedalism",
        cost: 1,
        power: 2,
        quote: "A simple locomotion trait."
    },

    carnivory: {
        id: "carnivory",
        name: "Carnivory",
        cost: 1,
        power: 2,
        quote: "I'll stick with this hamburger."
    },

    claws: {
        id: "claws",
        name: "Claws",
        cost: 1,
        power: 3,
        quote: "Sharp!",
        description: "On play: Reduce a random enemy card's power by 1.",
        effects: [
            {
                trigger: "on_play",
                type: "reduce_power",
                amount: 1,
                target: {
                    owner: "enemy",
                    zones: ["active"],
                    selection: "random",
                    count: 1
                }
            }
        ]
    },

    talons: {
        id: "talons",
        name: "Talons",
        cost: 1,
        power: 2,
        quote: "Claws but for birds.",
        description: "On play: Reduce a random enemy card's power by 2.",
        effects: [
            {
                trigger: "on_play",
                type: "reduce_power",
                amount: 2,
                target: {
                    owner: "enemy",
                    zones: ["active"],
                    selection: "random",
                    count: 1
                }
            }
        ]
    },

    feathers: {
        id: "feathers",
        name: "Feathers",
        cost: 2,
        power: 2,
        quote: "Good for warmth and potentially flight.",

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
        quote: "Fit for a hunter.",
    },

    thick_hide: {
        id: "thick_hide",
        name: "Thick Hide",
        cost: 2,
        power: 3,
        quote: "Those claws are useless.",
        description: "Your cards in play cannot have their power reduced.",

        effects: [
            {
                trigger: "ongoing",
                type: "power_protection",
                target: {
                    owner: "self",
                    zones: ["active"],
                    selection: "all"
                }
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
                scaleType: "target_count",
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
        description: "On play: Destroy a random unprotected enemy card.",

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
        quote: "A bundle deal of traits including bipedalism, carnivory, and claws.",
        description: "...",
        effects: [
            {
                trigger: "on_play",
                type: "summon_cards",
                source: "specific",
                cards: ["bipedalism", "carnivory", "claws"],

            },
        ]
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

    tubular: {
        id: "tubular",
        name: "Tubular",
        cost: 1,
        power: 0,
        description: "Ongoing: Has power equal to the number of cards in both hands.",

        effects: [
            {
                trigger: "ongoing",
                type: "scale_power",
                amount: 1,
                scaleType: "target_count",
                countTargets: {
                    owner: "both",
                    zones: ["hand"],
                    selection: "all"
                }
            }
        ]
    },

    apex: {
        id: "apex",
        name: "Apex",
        cost: 5,
        power: 0,
        description: "Ongoing: Gains 3 power for each card that has been played this game.",
        effects: [
            {
                trigger: "ongoing",
                type: "scale_power",
                amount: 3,

                scaleType: "stat_count",
                stat: "totalCardsPlayed"
            }
        ]
    },
    mimic: {
        id: "mimic",
        name: "Mimic",
        cost: 4,
        power: 0,
        description: "Ongoing: Has power equal to the highest power of all cards in play.",
        effects: [
            {
                trigger: "ongoing",
                type: "scale_power",
                amount: 1,
                scaleType: "target_power",
                countTargets: {
                    owner: "both",
                    zones: ["active"],
                    selection: "highest_power",
                },
                excludeSelf: true
            }
        ]
    },
};