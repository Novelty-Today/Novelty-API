const mongoose = require('mongoose')
const Schema= mongoose.Schema

const feedbackSchema = new Schema({
    email: { type: String, required: true },
    text: { type: String, required: false },
    stars: { type: Number, required: false, min: 1, max: 5 },
    dateTime: { type: String, required: true },
})

const Feedback = mongoose.model('Feedback', feedbackSchema)

module.exports = Feedback