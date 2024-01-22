const Note = require('../models/Note')
const User = require('../models/User')

// @desc Pobierz wszystkie role
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
    // Pobierz wszystkie notki z MongoDB
    const notes = await Note.find().lean()

    // Jeśli nie ma notek
    if (!notes?.length) {
        return res.status(400).json({ message: 'Nie znaleziono notek' })
    }

    // Dodaj nazwę użytkownika do każdej notki przed wysłaniem odpowiedzi
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec()
        return { ...note, username: user.username }
    }))

    res.json(notesWithUser)
}

// @desc Stwórz nową notkę
// @route POST /notes
// @access Private
const createNewNote = async (req, res) => {
    const { user, title, text } = req.body

    // Potwierdzenie danych
    if (!user || !title || !text) {
        return res.status(400).json({ message: 'Wszystkie pola wymagane' })
    }

    // Sprawdź duplikaty
    const duplicate = await Note.findOne({ title }).collation({ locale: 'pl', strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Zduplikowany tytuł notki' })
    }

    // Stwórz i przechowaj nową notkę
    const note = await Note.create({ user, title, text })

    if (note) { // Stworzone
        return res.status(201).json({ message: 'Utworzono nową notkę' })
    } else {
        return res.status(400).json({ message: 'Otrzymano niepoprawne dane notki' })
    }

}

// @desc Zaktualizuj notkę
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
    const { id, user, title, text, completed } = req.body

    // Potwierdzenie danych
    if (!id || !user || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Wszystkie pola wymagane' })
    }

    // Weryfikacja czy notka istnieje i można ją edytować
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Notka nie została znaleziona' })
    }

    // Sprawdź duplikaty tytułów
    const duplicate = await Note.findOne({ title }).collation({ locale: 'pl', strength: 2 }).lean().exec()

    // Zezwól na zmianę nazwy notki jeśli nie jest to duplikat
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

// @desc Usuń notkę
// @route DELETE /notes
// @access Private
const deleteNote = async (req, res) => {
    const { id } = req.body

    // Potwierdzenie danych
    if (!id) {
        return res.status(400).json({ message: 'Wymagane ID notki' })
    }

    // Weryfikacja czy notka istnieje i można ją usunąć
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