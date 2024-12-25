const mongoose = require('mongoose');

// Schema for shapes (arrows and circles)
const shapeSchema = new mongoose.Schema({
    brush: String,
    orig: String,
    dest: String,
    opacity: Number
}, { _id: false });

// Schema for move annotations
const annotationSchema = new mongoose.Schema({
    moveNumber: {
        type: Number,
        required: true
    },
    move: {
        type: String,
        required: true
    },
    comment: String,
    nags: [String], // Numeric Annotation Glyphs (e.g., !!, !?, ?!, etc.)
    variations: [String],
    variation: String,
    isBlackMove: Boolean,
    shapes: [shapeSchema]
}, { _id: false });

const gameSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: String,
        default: 'Casual Game'
    },
    site: {
        type: String,
        default: 'Unknown'
    },
    date: {
        type: Date,
        default: null
    },
    round: {
        type: String,
        default: '-'
    },
    white: {
        type: String,
        default: 'Unknown'
    },
    black: {
        type: String,
        default: 'Unknown'
    },
    result: {
        type: String,
        default: '*'
    },
    eco: {
        type: String,
        default: null
    },
    whiteElo: {
        type: Number,
        set: v => (isNaN(v) ? null : v),
        default: null
    },
    blackElo: {
        type: Number,
        set: v => (isNaN(v) ? null : v),
        default: null
    },
    pgn: {
        type: String,
        required: true
    },
    moves: {
        type: String,
        default: ''
    },
    timeControl: {
        type: String,
        default: null
    },
    termination: {
        type: String,
        default: null
    },
    annotations: [{
        moveNumber: Number,
        variation: String,
        comment: String,
        isBlackMove: Boolean,
        nags: [String],
        shapes: [{
            brush: String,
            orig: String,
            dest: String
        }]
    }],
    generalComments: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted date
gameSchema.virtual('formattedDate').get(function() {
    if (!this.date) return 'Unknown Date';
    return new Date(this.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Virtual for formatted creation date
gameSchema.virtual('formattedCreatedAt').get(function() {
    return new Date(this.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Pre-save middleware to handle null values
gameSchema.pre('save', function(next) {
    // Convert NaN to null for numeric fields
    if (this.whiteElo === null || isNaN(this.whiteElo)) this.whiteElo = null;
    if (this.blackElo === null || isNaN(this.blackElo)) this.blackElo = null;

    // Convert empty strings to null for optional string fields
    if (this.eco === '') this.eco = null;
    if (this.timeControl === '') this.timeControl = null;
    if (this.termination === '') this.termination = null;

    // Handle date
    if (this.date === '') {
        this.date = null;
    } else if (this.date && typeof this.date === 'string') {
        // Try to parse the date if it's a string
        const parsedDate = new Date(this.date);
        this.date = isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    next();
});

// Method to transform the game object for API responses
gameSchema.methods.toAPI = function() {
    return {
        id: this._id,
        event: this.event,
        site: this.site,
        date: this.formattedDate,
        round: this.round,
        white: this.white,
        black: this.black,
        result: this.result,
        eco: this.eco,
        whiteElo: this.whiteElo,
        blackElo: this.blackElo,
        timeControl: this.timeControl,
        termination: this.termination,
        pgn: this.pgn,
        annotations: this.annotations,
        generalComments: this.generalComments,
        createdAt: this.formattedCreatedAt
    };
};

// Index for faster queries
gameSchema.index({ user: 1, createdAt: -1 });
gameSchema.index({ white: 1, black: 1 });
gameSchema.index({ date: 1 });

// Only create the model if it hasn't been registered
module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema);
