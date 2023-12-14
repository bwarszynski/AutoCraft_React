const Note = require('../models/Note')
const User = require('../models/User')

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
    // Get all notes from MongoDB
    const notes = await Note.find().lean()

    // If no notes
    if (!notes?.length) {
        return res.status(400).json({ message: 'Nie znaleziono notek' })
    }

    // Add username to each note before sending the response
    // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE
    // You could also do this with a for...of loop
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec()
        return { ...note, username: user.username }
    }))

    res.json(notesWithUser)
}

// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = async (req, res) => {
    const { user, title, text } = req.body

    // Confirm data
    if (!user || !title || !text) {
        return res.status(400).json({ message: 'Wszystkie pola wymagane' })
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({ title }).collation({ locale: 'pl', strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Zduplikowany tytuł notki' })
    }

    // Create and store the new user
    const note = await Note.create({ user, title, text })

    if (note) { // Created
        return res.status(201).json({ message: 'Utworzono nową notkę' })
    } else {
        return res.status(400).json({ message: 'Otrzymano niepoprawne dane notki' })
    }

}

// @desc Update a note
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
    const { id, user, title, text, completed } = req.body

    // Confirm data
    if (!id || !user || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Wszystkie pola wymagane' })
    }

    // Confirm note exists to update
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Notka nie została znaleziona' })
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({ title }).collation({ locale: 'pl', strength: 2 }).lean().exec()

    // Allow renaming of the original note
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Zduplikowany tytuł notki' })
    }

    note.user = user
    note.title = title
    note.text = text
    note.completed = completed

    const updatedNote = await note.save()

    res.json(`'${updatedNote.title}' zaktualizowana`)
}

// @desc Delete a note
// @route DELETE /notes
// @access Private
const deleteNote = async (req, res) => {
    const { id } = req.body

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'Wymagane ID notki' })
    }

    // Confirm note exists to delete
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Notka nie znaleziona' })
    }

    const result = await note.deleteOne()

    const reply = `Notka '${result.title}' o ID ${result._id} usunięta`

    res.json(reply)
}

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}