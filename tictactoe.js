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

$(function() {
    var game = new TicTacToe();
    var board = new TicTacToeUI(game, $('#board'));
    board.render();
    game.start();
});
