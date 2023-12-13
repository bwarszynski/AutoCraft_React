const Note = require('../models/Note')
const User = require('../models/User')
const asyncHandler = require('express-async-handler')

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = asyncHandler(async (req, res) => {
    // GET notki z MongoDB
    const notes = await Note.find().lean()

    // Jeśli nie ma notek
    if (!notes?.length) {
        return res.status(400).json({ message: 'Nie znaleziono notek' })
    }

    // Dodaj nazwę użytkownika do wysłanych notek
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec()
        return { ...note, username: user.username }
    }))

    res.json(notesWithUser)
})

// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = asyncHandler(async (req, res) => {
    const { user, title, text } = req.body

    // Potwierdź dane
    if (!user || !title || !text) {
        return res.status(400).json({ message: 'Wszystkie pola wymagane' })
    }

    // Sprawdź zduplikowany tytuł
    const duplicate = await Note.findOne({ title }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Zduplikowany tytuł notki' })
    }

    // Stwórz i przechowuj nowego użytkownika
    const note = await Note.create({ user, title, text })

    if (note) { // Stworzone
        return res.status(201).json({ message: 'Utworzono nową notkę' })
    } else {
        return res.status(400).json({ message: 'Otrzymano niewłaściwe informacje' })
    }

})

// @desc Update a note
// @route PATCH /notes
// @access Private
const updateNote = asyncHandler(async (req, res) => {
    const { id, user, title, text, completed } = req.body

    // Potwierdź dane
    if (!id || !user || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Wszystkie pola wymagane' })
    }

    // Potwierdź istnienie notki do aktualizacji
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Notka nie została znaleziona' })
    }

    // Sprawdź zduplikowany tytuł
    const duplicate = await Note.findOne({ title }).lean().exec()

    // Zezwól na aktualizację, jeśli tytuł nie jest zduplikowany
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Zduplikowany tytuł notki' })
    }

    note.user = user
    note.title = title
    note.text = text
    note.completed = completed

    const updatedNote = await note.save()

    res.json(`'${updatedNote.title}' zaktualizowano`)
})

// @desc Delete a note
// @route DELETE /notes
// @access Private
const deleteNote = asyncHandler(async (req, res) => {
    const { id } = req.body

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'Wymagane ID notki' })
    }

    // Confirm note exists to delete
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Notka nie została znaleziona' })
    }

    const result = await note.deleteOne()

    const reply = `Notka '${result.title}' o ID ${result._id} została usunięta`

    res.json(reply)
})

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}