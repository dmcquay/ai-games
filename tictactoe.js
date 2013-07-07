String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

function TicTacToeHistory() {
    this.layouts = {};
    this.currentLayouts = [];
};
TicTacToeHistory.prototype = {
    addLayout: function(layout) {
        this.currentLayouts.push(layout);
    },

    gameOver: function(outcome) {
        this.storeOutcomes(outcome, this.currentLayouts);
        if (outcome == TicTacToe.WIN) {
            this.storeOutcomes(TicTacToe.LOSE, this.reverseLayouts(this.currentLayouts));
        } else if (outcome == TicTacToe.LOSE) {
            this.storeOutcomes(TicTacToe.WIN, this.reverseLayouts(this.currentLayouts));
        }
        this.currentLayouts = [];
    },

    reverseLayouts: function(layouts) {
        var layout, newLayouts = [];
        for (var i = 0; i < layouts.length; i++) {
            layout = '';
            for (var c = 0; c < layouts[i].length; c++) {
                if (layouts[i][c] == TicTacToe.EMPTY) {
                    layout += layouts[i][c];
                } else if (layouts[i][c] == TicTacToe.HUMAN) {
                    layout += TicTacToe.AI;
                } else {
                    layout += TicTacToe.HUMAN;
                }
            }
            newLayouts.push(layout);
        }
        return newLayouts;
    },

    storeOutcomes: function(outcome, layouts) {
        var points = 0,
            bonus = 0;

        if (outcome != TicTacToe.WIN) {
            bonus = Math.max(0, layouts.length - 6);
        }

        for (var i = 0; i < layouts.length; i++) {
            this.layouts[layouts[i]] = this.layouts[layouts[i]] || 0;
            
            // gain points for winning, lose points for losing.
            // lose/gain more points the close the move was to the end of the game.
            // get point bonus for longer games.

            if (outcome == TicTacToe.Draw) {
                points = 0;
            } else if (outcome == TicTacToe.WIN) {
                points = i + 1;
            } else {
                points = i * -1;
            }

            points += bonus;

            this.layouts[layouts[i]] += points;
        }
    },

    getOptimalNextMove: function(layout) {
        var self = this,
            possibleLayouts = [],
            i, newLayout;
        
        // Make a list of possible next layouts.
        for (i = 0; i < layout.length; i++) {
            if (layout[i] == TicTacToe.EMPTY) {
                possibleLayouts.push({
                    layout: layout.replaceAt(i, TicTacToe.AI),
                    newPosition: i
                });
            }
        }

        // Rank by score. unknown score is 0.
        _.each(possibleLayouts, function(layout) {
            layout.score = self.layouts[layout.layout] || 0;
        });

        // Return highest scoring position
        possibleLayouts.sort(function(a, b) {
            return b.score - a.score;
        });
        return possibleLayouts[0].newPosition;
    },

    export: function() {
        return JSON.stringify(this.layouts);
    },

    import: function(data) {
        this.layouts = JSON.parse(data);
    }
};

function TicTacToe() {
    this.init();
};

TicTacToe.EMPTY = ' ';
TicTacToe.NOBODY = -1;
TicTacToe.HUMAN = 'X';
TicTacToe.AI = 'O';
TicTacToe.DRAW = 1;
TicTacToe.GAME_IN_PROGRESS = 2;
TicTacToe.GAME_OVER = 3;
TicTacToe.NO_OPEN_POSITIONS = -1;
TicTacToe.WIN = 4;
TicTacToe.LOSE = 5;

TicTacToe.prototype = {
    init: function() {
        var self = this;

        this.size = 9;
        this.listeners = {};

        this.clear();

        this.history = new TicTacToeHistory();
        this.on('gameOver', function() {
            var outcome = TicTacToe.DRAW;
            if (self.winner == TicTacToe.AI) {
                outcome = TicTacToe.WIN;
            }
            if (self.winner == TicTacToe.HUMAN) {
                outcome = TicTacToe.LOSE;
            }
            self.history.gameOver(outcome);
        });
    },

    start: function() {
        if (parseInt(Math.random() * 2) == 1) {
            this.aiMove();
        }
    },

    clear: function() {
        this.positions = '';
        this.winner = null;
        for (var i = 0; i < this.size; i++) {
            this.positions += TicTacToe.EMPTY;
        }
        this.state = TicTacToe.GAME_IN_PROGRESS;
        this.trigger('stateChanged');
    },

    setPosition: function(position, val) {
        if (val != TicTacToe.HUMAN && val != TicTacToe.AI) {
            throw "Invalid value"
        }
        this.positions = this.positions.replaceAt(position, val);
    },

    move: function(position, val) {
        if (this.state != TicTacToe.GAME_IN_PROGRESS) {
            throw "Game is over";
        }
        if (this.positions[position] != TicTacToe.EMPTY) {
            throw "Position not available";
        }
        this.setPosition(position, val);
        this.history.addLayout(this.positions);
        this.trigger('stateChanged');
        this.detectState();
    },

    detectState: function() {
        var winner = this.detectWinner();
        if (winner != TicTacToe.NOBODY) {
            this.winner = winner;
            this.state = TicTacToe.GAME_OVER;
        } else if (this.getOpenPosition() == TicTacToe.NO_OPEN_POSITIONS) {
            this.winner = TicTacToe.DRAW;
            this.state = TicTacToe.GAME_OVER;
        }

        if (this.state != TicTacToe.GAME_IN_PROGRESS) {
            this.trigger('gameOver');
        }
    },

    detectWinner: function() {
        var winningPatterns = [
            [0,1,2],
            [3,4,5],
            [6,7,8],
            [0,3,6],
            [1,4,7],
            [2,5,8],
            [0,4,8],
            [2,4,6]
        ];
        var pattern, val, lastVal, foundWinner;
        for (var i = 0; i < winningPatterns.length; i++) {
            pattern = winningPatterns[i];
            lastVal = this.positions[pattern[0]];
            foundWinner = true;
            for (var c = 0; c < pattern.length; c++) {
                val = this.positions[pattern[c]];
                if (val != lastVal || val == TicTacToe.EMPTY) {
                    foundWinner = false;
                    break; // this pattern did not produce a winner
                }
            }
            if (foundWinner) {
                return lastVal; // WINNER!
            }
        }
        return TicTacToe.NOBODY;
    },

    aiMove: function() {
        if (this.state != TicTacToe.GAME_IN_PROGRESS) {
            return;
        }
        var pos = this.getOpenPosition();
        if (pos == -1) {
            throw "No positions available";
        }
        pos = this.history.getOptimalNextMove(this.positions);
        this.move(pos, TicTacToe.AI);
    },

    humanMove: function(position) {
        this.move(position, TicTacToe.HUMAN);
        this.aiMove();
    },

    getOpenPosition: function() {
        for (var i = 0; i < this.positions.length; i++) {
            if (this.positions[i] == TicTacToe.EMPTY) {
                return i;
            }
        }
        return -1;
    },

    on: function(evtName, callback) {
        this.listeners[evtName] = this.listeners[evtName] || [];
        this.listeners[evtName].push(callback);
    },

    trigger: function(evtName) {
        var listeners = this.listeners[evtName] || [];
        for (var i = 0; i < listeners.length; i++) {
            listeners[i]();
        }
    }
};

function TicTacToeUI() {
    this._init.apply(this, arguments);
};
TicTacToeUI.prototype = {
    _init: function(game, $boardEl) {
        this.game = game;
        this.$boardEl = $boardEl;
        this._initListeners();
    },

    _initListeners: function() {
        var self = this;
        this.game.on('stateChanged', function() {
            self.render();
        });
        this.game.on('gameOver', function() {
            if (self.game.winner == TicTacToe.DRAW) {
                self.addOutcome("draw");
            } else {
                if (self.game.winner == TicTacToe.HUMAN) {
                    self.addOutcome("win");
                } else {
                    self.addOutcome("lose");
                }
            }
            setTimeout(function() {
                self.game.clear();
                self.game.start();
            }, 1000);
        });
        this.$boardEl.on('click', 'li', function(evt) {
            evt.preventDefault();
            self.game.humanMove($(this).data('position'));
        });
        $('#import').on('click', function() {
            self.game.history.import($('#layouts').val());
        });
        $('#export').on('click', function() {
            $('#layouts').val(self.game.history.export());
        });
    },

    addOutcome: function(outcome) {
        //alert(outcome);
        var $el = $('#outcomes').find('.'+outcome);
        var count = parseInt($el.data('count')) + 1;
        $el.data('count', count).html(count);
        
        var message = '';
        switch (outcome) {
            case 'win':
                message = 'You Win!';
                break;
            case 'lose':
                message = 'You Lose';
                break;
            case 'draw':
                message = 'Draw';
                break;
        }

        $('#outcomes .message').html(message).fadeIn();
        setTimeout(function() {
            $('#outcomes .message').fadeOut();
        }, 2000);
        //$('<li>').html(outcome).appendTo($('#outcomes'));
    },

    render: function() {
        this.$boardEl.html('');
        for (var i = 0; i < this.game.positions.length; i++) {
            $('<li>').data('position', i).html(this.game.positions[i]).appendTo(this.$boardEl);
        }
    }
};
var data = {"O        ":30,"O X      ":72,"OOX      ":-2,"OOX X    ":-7,"OOXOX    ":-4,"OOXOX X  ":-15,"X        ":106,"X O      ":58,"XXO      ":6,"XXO O    ":12,"XXOXO    ":5,"XXOXO O  ":18,"X O X    ":9,"XOO X    ":-13,"XOO X   X":-12,"O X O    ":-1,"OXX O    ":26,"OXX O   O":15,"O X O   X":-8,"OOX O   X":-4,"OOX OX  X":-10,"X O X   O":14,"XXO X   O":5,"XXO XO  O":12,"      X  ":1,"O     X  ":11,"O   X X  ":-3,"OO  X X  ":-3,"OOX X X  ":-24,"      O  ":10,"X     O  ":47,"X   O O  ":6,"XX  O O  ":4,"XXO O O  ":30,"X OX     ":6,"XOOX     ":-3,"XOOX  X  ":-4,"O XO     ":2,"OXXO     ":4,"OXXO  O  ":5,"        X":12,"O       X":20,"O    X  X":-1,"OO   X  X":-3,"OOX  X  X":-4,"        O":15,"X       O":33,"X    O  O":3,"XX   O  O":4,"XXO  O  O":5,"     X   ":5,"O    X   ":2,"O   XX   ":-2,"OO  XX   ":-3,"OO XXX   ":-20,"     O   ":6,"X    O   ":9,"X   OO   ":3,"XX  OO   ":4,"XX OOO   ":25," O   X   ":-1," O  XX   ":-2," OO XX   ":-3," OOXXX   ":-4," X   O   ":2," X  OO   ":3," XX OO   ":4," XXOOO   ":5," O    X  ":2," O X  X  ":3,"OO X  X  ":4,"OO X XX  ":5,"OOOX XX  ":12," X    O  ":-1," X O  O  ":-2,"XX O  O  ":1,"XX O OO  ":-4,"XXXO OO  ":-10,"O XO    X":-6,"OOXO    X":-4,"OOXO X  X":-10,"X OX    O":8,"XXOX    O":5,"XXOX O  O":12,"OO    X  ":22,"OO    X X":-6,"OOO   X X":10,"XX    O  ":26,"XX    O O":13,"XXX   O O":-8,"OOX   X  ":3,"OOXO  X  ":-4,"XXO   O  ":52,"XXOX  O  ":5,"O XO  X  ":0,"O XOO X  ":3,"O XOO X X":9,"OOXOO X X":-4,"OOXOOXX X":-5,"X OX  O  ":6,"X OXX O  ":2,"X OXX O O":-2,"XXOXX O O":7,"XXOXXOO O":8,"OO      X":-2,"OOX     X":-4,"OOX  O  X":-2,"OOX  OX X":-3,"OOXO OX X":-4,"OOXOXOX X":-5,"XX      O":6,"XXO     O":8,"XXO  X  O":5,"XXO  XO O":6,"XXOX XO O":7,"XXOXOXO O":8,"       X ":4,"O      X ":1,"OX     X ":-9,"OXO    X ":-3,"OXO X  X ":-4,"       O ":10,"X      O ":25,"XO     O ":15,"XOX    O ":4,"XOX O  O ":5,"O   X    ":15,"OO  X    ":-2,"OOX XO   ":-4,"OOX XOX  ":-10,"X   O    ":26,"XX  O    ":6,"XXO OX   ":5,"XXO OXO  ":12,"    X    ":5," O  X    ":2," OX X    ":-4," OXOX    ":-3," OXOX X  ":-8,"    O    ":12," X  O    ":16," XO O    ":6," XOXO    ":4," XOXO O  ":10,"  O X    ":-6,"  O X   X":-5,"O O X   X":-2,"OXO X   X":-3,"OXOOX   X":-4,"OXOOX  XX":-5,"  X O    ":37,"  X O   O":9,"X X O   O":4,"XOX O   O":5,"XOXXO   O":6,"XOXXO  OO":7,"OOX O X  ":23,"OOX O X X":-5,"OOX OOX X":3,"OOXXOOX X":4,"OOXXOOXOX":9,"XXO X O  ":23,"XXO X O O":16,"XXO XXO O":4,"XXOOXXO O":4,"XXOOXXOXO":-5,"OOX   O X":-4,"OOX  XO X":-5,"XXO   X O":5,"XXO  OX O":6,"OOX O XX ":21,"OOXOO XX ":17,"OOXOOXXX ":56,"OOXOOXXXO":63,"XXO X OO ":18,"XXOXX OO ":35,"XXOXXOOO ":-28,"XXOXXOOOX":-35," O      X":0," O    X X":-1,"OOX   X X":-6,"OOX O XXX":-10," X      O":2," X    O O":3,"XXO   O O":10,"XXO X OOO":14,"O O     X":38,"OXO     X":43,"OXOO    X":-1,"OXOO  X X":-5,"OXOOO X X":-3,"OXOOOXX X":-8,"OXOOOXXOX":-20," O     X ":0," OX    X ":-1,"OOX    X ":-5,"OOX    XX":-9,"OOXO   XX":-4,"OOXO X XX":-5," X     O ":2," XO    O ":3,"XXO    O ":24,"XXO    OO":15,"XXOX   OO":6,"XXOX O OO":7,"OO     X ":6,"OOXO   X ":-1,"OOXO  XX ":-3,"XX     O ":8,"XXOX   O ":14,"XXOX  OO ":16,"O X    X ":-2,"OOX O  XX":-4,"OOX OX XX":-5,"X O    O ":6,"XXO X  OO":6,"XXO XO OO":7,"OOX  O XX":-4,"OOX  OXXX":-5,"XXO  X OO":6,"XXO  XOOO":7,"O  X     ":18,"OO X     ":16,"OOXX     ":6,"OOXXO    ":-1,"OOXXO  X ":-2,"OOXXOO X ":-3,"OOXXOO XX":-8,"OOXXOOOXX":-10,"O     X X":-25,"X     O O":42,"O XO OX  ":-4,"O XOXOX  ":-10,"X OX XO  ":5,"X OXOXO  ":12,"OOXOO XXX":-40,"XXOXX OOO":64,"O XOO   X":-3,"O XOOOX X":14,"X OXX   O":7,"X OXXXO O":-10,"OX O   X ":-3,"OX OX  X ":-4,"XO X   O ":4,"XO XO  O ":5,"OX  O  X ":-2,"OX  O  XX":-3,"OXO O  XX":-4,"OXO O XXX":-10,"XO  X  O ":4,"XO  X  OO":5,"XOX X  OO":6,"XOX X OOO":14,"O XOOX  X":-10,"X OXXO  O":12,"OX       ":0,"OXO      ":-2,"OXO X    ":-9,"OXOOX    ":-4,"OXOOX  X ":-5,"XO       ":4,"XOX      ":3,"XOX O    ":12,"XOXXO    ":5,"XOXXO  O ":6," X       ":4," X  O   X":-1,"OX  O   X":-2,"OX  O X X":-3,"OXO O X X":-8," O       ":6," O  X   O":3,"XO  X   O":4,"XO  X O O":5,"XOX X O O":6,"OOXX O   ":-1,"OOXXXO   ":-2,"OOXXXOO  ":-6,"OOXXXOOX ":-8,"OOXXXOOXO":-35,"O X     X":-43,"O X  O  X":-8,"O X  OX X":-13,"O XO OX X":-4,"O XOXOX X":-5,"X O     O":78,"X O  X  O":20,"X O  XO O":25,"X OX XO O":6,"X OXOXO O":7,"OXO O   X":-1,"OXO OOX X":-3,"OXOXOOX X":-4,"OXOXOOXOX":-5,"OO X X   ":-1,"OOOX X   ":15,"X  O     ":18,"XX O     ":0,"XX O O   ":11,"XXXO O   ":-12,"OOXX  O  ":-1,"OOXXX O  ":-10,"OOXXX OO ":-3,"OOXXX OOX":-4,"OOXXXOOOX":-20,"   X     ":8,"O  X X   ":-9,"   O     ":8,"X  O O   ":18," XX O    ":17,"OXX O   X":7,"OXXOO   X":-4,"OXXOOX  X":-5," OO X    ":-4,"XOO X   O":0,"XOOXX   O":6,"XOOXXO  O":7,"O X OO  X":-1,"O XXOO  X":-2,"OOXXOO  X":-3,"O X O O X":-4,"O X OXO X":-5,"X O X X O":5,"X O XOX O":6,"O X  O   ":-2,"O X XO   ":-3,"O XOXO   ":-4,"X O  X   ":3,"X O OX   ":4,"X OXOX   ":5," OX XO   ":-3," OX XOX  ":-8," XO OX   ":4," XO OXO  ":10,"O O X    ":-4,"OXO XO   ":-4,"OXO XO X ":-5,"X X O    ":6,"XOX OX   ":5,"XOX OX O ":6,"  X      ":24,"  X O   X":10," OX O   X":-3," OX OX  X":-4,"  O      ":44,"  O X   O":-3," XO X   O":4," XO XO  O":5,"O X   O  ":108,"O X   O X":3,"O XO  O X":70,"X O   X  ":-37,"X O   X O":30,"X OX  X O":-56,"O X  XO X":-68,"X O  OX O":85,"O XX  O  ":73,"O XXO O  ":-2,"O XXO O X":-3,"OOXXO O X":-4,"OOXXOXO X":-5,"X OO  X  ":-24,"X OOX X  ":5,"X OOX X O":6,"XXOOX X O":7,"XXOOXOX O":8,"O XX OO  ":-1,"O XX OO X":-4,"OOXX OO X":-3,"OOXXXOO X":-8,"O XX  OO ":-2,"O XX  OOX":-3,"OOXX  OOX":-4,"OOXX XOOX":-5,"X OO  XX ":5,"X OO  XXO":6,"XXOO  XXO":7,"XXOO OXXO":8,"O X   X  ":-10,"X O   O  ":15,"O X X O  ":7,"OOX X O  ":-4,"OOXXX O O":-8,"OOXXXXO O":-15,"X O O X  ":-2,"XXO O X  ":10,"XXOOO X  ":12,"XXOOO X X":14,"XXOOOOX X":24,"O  XX    ":-3,"OO XX    ":-3,"X  OO    ":9,"XX OO    ":4,"OOXX   O ":5,"OOXX X O ":4,"OOXXOX O ":14,"XXOO     ":4,"XXOO   X ":4,"XXOO O X ":4,"XXOOXO X ":-10,"X O     X":-5,"XOO     X":-3,"O X     O":9,"OXX     O":4,"OX O     ":0,"OX O  X  ":-1,"OXOO  X  ":-2,"OXOO OX X":-4,"OXOO OXXX":-5,"XO X     ":3,"XO X  O  ":4,"XOXX  O  ":5,"XOXX  O O":6,"XOXX XO O":7,"XOXX XOOO":8,"X OO  X X":-50,"XOOO  X X":-4,"XOOO  XXX":-5,"O XX  O O":91,"OXXX  O O":6,"OXXX  OOO":7,"O X    OX":-6,"O X  X OX":-8,"X O    XO":8,"X O  O XO":10,"O X OOX X":-2,"O XXOOX X":-3,"OOXXOOXXX":-10,"X O XXO O":6,"X OOXXO O":7,"XXOOXXOOO":18,"O XX XO O":15,"OOXX XO O":-4,"X OO OX X":-6,"XXOO OX X":7,"O X  OXOX":-12,"O X XOXOX":-15,"X O  XOXO":18,"X O OXOXO":21,"  O  X   ":2,"  OX X   ":2,"O OX X   ":-3,"OXOX X   ":-1,"OXOXOX   ":-2,"OXOXOXX  ":-3,"OXOXOXXO ":-4,"OXOXOXXOX":-5,"O OXXX   ":-12,"  X  O   ":3,"  XO O   ":1,"X XO O   ":4,"X XOOO   ":15,"OO   X   ":-1,"XX   O   ":4,"OOX  X   ":-6,"OOXO X   ":-4,"XXO  O   ":8,"XXOX O   ":5,"  O XX   ":-2,"O O XX   ":-3,"  X OO   ":3,"X X OO   ":4,"O OXX    ":-3,"X XOO    ":4,"O  XXO   ":0,"O XXXO   ":-1,"O XXXOO  ":-2,"O XXXOOX ":-3,"O XXXOOXO":-16,"OXXXXOOXO":-5,"X  OOX   ":4,"X OOOX   ":5,"X OOOXX  ":6,"X OOOXXO ":7,"X OOOXXOX":8,"XOOOOXXOX":9,"O X X    ":-4,"O XOX    ":-3,"O XOX X  ":-4,"X O O    ":6,"X OXO    ":4,"X OXO O  ":5,"O  OX    ":-2,"O  OX X  ":-3,"OO OX X  ":-4,"X  XO    ":3,"X  XO O  ":4,"XX XO O  ":5," O  X X  ":-5," OO X X  ":-2,"XOO X X  ":-3,"XOOOX X  ":-4,"XOOOX X X":-5," X  O O  ":9," XX O O  ":4,"OXX O O  ":5,"OXXXO O  ":6,"OXXXO O O":7,"OOXX X   ":-6,"OOXX X OX":-10,"XXOO O   ":10,"XXOO O XO":14,"O XX  OXO":82,"OOXX  OXO":-3,"OOXXX OXO":-8,"X OOXOX X":-15,"O XXOXO O":21,"O XXX O O":6,"O XXXOO O":-2,"OXXXXOO O":8,"OXXXXOOOO":9,"X OOO X X":-6,"X OOOXX X":-3,"XOOOOXX X":-4,"XOOOOXXXX":-5,"X OO    X":-3,"X OOX   X":-8,"O XX    O":4,"O XXO   O":10,"O O  X  X":0,"OXO  X  X":-1,"OXOO X  X":-2,"OXOO XX X":-3,"OXOO XXOX":-4,"OXOOXXXOX":-5,"OO    XXX":-16,"XX    OOO":20,"O O   X X":-5,"O O   XXX":-12,"X X   O O":9,"X X   OOO":15,"O XXO OXO":98,"X OO  XOX":-56,"X OOX XOX":-70,"X O O   X":-6,"X O O X X":-15,"XOO O X X":-4,"XOO O XXX":-5,"O X X   O":17,"O X X O O":22,"OXX X O O":6,"OXX X OOO":7,"OOXXX  O ":-8,"OOXXXO O ":-7,"OOXXXO OX":-4,"OOXXX  OO":-4,"OOXXX XOO":-5,"XXOOO  X ":12,"XXOOO  XX":7,"XXOOO OXX":8,"O XO X  X":-4,"X OX O  O":5,"OXO  O  X":-2,"OXO  O XX":-3,"OXOO O XX":-4,"OXOOXO XX":-10,"X X     O":-10,"XOX     O":-18,"XOX  X  O":5,"XOX  X OO":6,"XOXX X OO":7,"XOXXOX OO":16,"OXO   O X":55,"OXOX  O X":54,"OXOXO O X":63,"XOX   X O":-33,"XOXO  X O":-36,"XOXOX X O":-45,"XXO   O X":5,"XXOO  O X":6,"XXOO XO X":7,"XXOOOXO X":8,"OOX   X O":-2,"OOXX  X O":-3,"OOXX OX O":-4,"OOXXXOX O":-5,"O XX  O X":-4,"OOXX  O X":-4,"OOXX XO X":-5,"X OO  X O":5,"XXOO  X O":6,"XXOO OX O":7,"O  O  X X":-6,"O  O  XXX":-8,"X  X  O O":8,"X  X  OOO":10," O OX X  ":-3," X XO O  ":4," OO X   X":-3," XX O   O":4," O  XOX  ":-3," X  OXO  ":4,"  OOX   X":-3,"  XXO   O":4,"O   XO   ":-2,"O   XOX  ":-3,"OO  XOX  ":-4,"X   OX   ":3,"X   OXO  ":4,"XX  OXO  ":5," O  X   X":-1,"OO  X   X":-2,"OOX X   X":-3,"OOXOX   X":-4,"OOXOX X X":-5," X  O   O":3,"XX  O   O":4,"XXO O   O":5,"XXOXO   O":6,"XXOXO O O":7,"OX   O X ":-3,"OX  XO X ":-4,"XO   X O ":4,"XO  OX O ":5," OOX X   ":4," OOX XX  ":5," XXO O   ":-3," XXO OO  ":-4,"OOX OOXXX":-5,"XXO XXOOO":8,"O   O X X":-6,"O   O XXX":-8,"X   X O O":8,"X   X OOO":10,"O   X O  ":-1,"O  XX O  ":-9,"OO XX O  ":-5,"O OXX O  ":-6,"OXOXX O  ":-3,"OXOXXOO  ":-4,"OXOXXOOX ":-5,"X   O X  ":15,"X  OO X  ":20,"X XOO X  ":10,"XOXOO X  ":6,"XOXOOXX  ":7,"XOXOOXXO ":8,"O  XXOO  ":-2,"OX XXOO  ":-2,"OX XXOOO ":-3,"OX XXOOOX":-4,"OXOXXOOOX":-5,"O  XX OO ":-2,"O  XX OOX":-3,"OO XX OOX":-4,"OO XXXOOX":-5,"X  OO XX ":5,"X  OO XXO":6,"XX OO XXO":7,"XX OOOXXO":8,"X OXO X  ":-8,"O XOX O  ":10,"O  XX O O":-2,"O  XX OXO":-3,"OO XX OXO":-4,"OO XXXOXO":-5,"X  OO X X":5,"X  OO XOX":6,"XX OO XOX":7,"XX OOOXOX":8,"OOXXXOXO ":-5,"XXOOOX X ":7,"XXOOOXOX ":8,"OOX OX   ":-4,"XXO XO   ":5,"O O  X   ":2,"OXO  X   ":0,"OXOO X   ":-1,"OXOO XX  ":-2,"OXOOOXX  ":-3,"OO XXXO  ":-5,"XX OO X  ":5,"XX OOOX  ":6,"O    OX X":-6,"O    OXXX":-8,"X    XO O":8,"X    XOOO":10,"O     XOX":-4,"O X   XOX":-6,"OOX   XOX":-4,"OOX  XXOX":-5,"X     OXO":8,"X O   OXO":10,"XXO   OXO":6,"XXO  OOXO":7,"OX    OX ":-3,"OX  X OX ":-4,"XO    XO ":4,"XO  O XO ":5,"OO    XX ":-2,"OOO   XX ":5,"XX    OO ":5,"XXX   OO ":-4,"O     XX ":-4,"X     OO ":6,"O XO  XOX":-4,"O XOX XOX":-5,"X OX  OXO":6,"X OXO OXO":7,"O XX OOXX":-3,"OOXX OOXX":-4,"OOXXXOOXX":-5,"O O X X  ":-2,"OXO X X  ":-3,"OXOOX X  ":-4,"OXOOX XX ":-5,"X X O O  ":4,"XOX O O  ":5,"XOXXO O  ":6,"XOXXO OO ":7,"O  X  X  ":1,"OOXX  X  ":-1,"OOXXO X  ":-2,"OOXXO XX ":-3,"OOXXOOXX ":-4,"X  O  O  ":3,"XXOO  O  ":5,"XXOOX O  ":6,"XXOOX OO ":7,"XXOOXXOO ":8," X  O  X ":3," XO O  X ":4," XO OX X ":5,"OXO OX X ":6,"OXOXOX X ":7,"OXOXOXOX ":8," O  X  O ":0," OX X  O ":-1," OX XO O ":-2,"XOX XO O ":-3,"XOXOXO O ":-4,"XOXOXOXO ":-5,"OXO  XO X":6,"OXOO XO X":7,"XOX  OX O":-4,"XOXX OX O":-5,"O   X  X ":-1,"OO  X  X ":-2,"OOX X  X ":-3,"OOXOX  X ":-4,"OOXOX XX ":-5,"X   O  O ":3,"XX  O  O ":4,"XXO O  O ":5,"XXOXO  O ":6,"XXOXO OO ":7,"OXO OX   ":-1,"OXO OXX  ":-2,"OXO OXXO ":-3,"OXO OXXOX":-8,"O  XXOOX ":-2,"OO XXOOX ":-3,"O OXXXO  ":-10,"X XOOOX  ":12,"O  XOX   ":-2,"O  XOX  X":-3,"OO XOX  X":-4,"OOXXOX  X":-5,"X  OXO   ":4,"X  OXO  O":5,"XX OXO  O":6,"XXOOXO  O":7,"O   X  O ":-2,"O   X XO ":-3,"OO  X XO ":-4,"OOX X XO ":-5,"X   O  X ":3,"X   O OX ":4,"XX  O OX ":5,"XXO O OX ":6,"OXO X O X":6,"OXOOX O X":7,"XOX O X O":-4,"XOXXO X O":-5,"O   X   O":15,"O X X OXO":16,"OOX X OXO":-3,"O XOX OXO":21,"X   O   X":-4,"X O O XOX":-12,"X OXO XOX":-15,"O XXX OOO":7,"X OOO XXX":-5,"  O     X":4,"  X     O":0,"XOO XX  O":-8,"XOOOXX  O":-3,"XOOOXX XO":-4,"XOOOXXOXO":-5,"O X X X O":-4,"X O O O X":5,"XOO XXO O":-4,"XOOXXXO O":-5,"OXX OO  X":12,"OXX OOX X":7,"OXXOOOX X":8,"XOO XX OO":-4,"XOOXXX OO":-5,"OXX OO XX":7,"OXXOOO XX":8,"XOOOX    ":-4,"XOOOX   X":-5,"OXXXO    ":5,"OXXXO   O":6,"  O XX  O":-10,"O O XX  O":-4,"O OXXX  O":-5,"  X OO  X":16,"X X OO  X":5,"X XOOO  X":6,"XOO XO   ":-4,"XOO XO  X":-10,"OXX OX   ":5,"OXX OX  O":12," OO XX  O":-4," OOXXX  O":-5," XX OO  X":5," XXOOO  X":6,"XOO X O  ":-4,"XOO X O X":-5,"OXX O X  ":5,"OXX O X O":6,"  OOX    ":-2,"X OOX    ":-3,"X OOXO   ":-4,"X OOXO  X":-5,"  XXO    ":3,"O XXO    ":4,"O XXOX   ":5,"O XXOX  O":6,"  O XO   ":-2,"  O XO  X":-4,"O O XO  X":-2,"OXO XO  X":-3,"OXOOXO  X":-4,"  X OX   ":6,"  X OX  O":8,"X X OX  O":5,"XOX OX  O":6,"XOXXOX  O":7,"  O   X  ":4,"O O   X  ":2,"OXO   X  ":0,"OXO O X  ":-1,"OXO O XOX":-3," OO XO  X":-4," XX OX  O":5,"  O X O  ":-2,"  O XXO  ":-3,"O O XXO  ":-4,"  X O X  ":3,"  X OOX  ":4,"X X OOX  ":5,"  O X  O ":-2,"  O XX O ":-3,"O O XX O ":-4,"O OXXX O ":-5,"  X O  X ":3,"  X OO X ":4,"X X OO X ":5,"X XOOO X ":6,"  OOXX  O":-2,"  OOXX XO":-3,"O OOXX XO":-4,"OXOOXX XO":-5,"  XXOO  X":5,"  XXOO OX":6,"X XXOO OX":7,"XOXXOO OX":8,"  O XXO O":-4,"  OXXXO O":-5,"  X OOX X":5,"  XOOOX X":6,"OXO X O  ":-4,"OXO X OX ":-5,"XOX O X  ":5,"XOX O XO ":6,"OXO  OX  ":-1,"OXO  OX X":-2,"OXO  OXOX":-3,"OXO XOXOX":-4,"OXOOXOXOX":-5,"XOO X  O ":-4,"XOO X  OX":-5,"OXX O  X ":5,"OXX O  XO":6};

$(function() {
    var game = new TicTacToe();
    game.import(data);
    var board = new TicTacToeUI(game, $('#board'));
    board.render();
    game.start();
});
