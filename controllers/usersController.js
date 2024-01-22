const User = require('../models/User')
const Note = require('../models/Note')
const bcrypt = require('bcrypt')

// @desc Pobierz wszystkich użytkowników
// @route GET /users
// @access Private
const getAllUsers = async (req, res) => {
    // Pobierz wszystkich użytkowników z MongoDB
    const users = await User.find().select('-password').lean()

    // Jeśli nie ma użytkowników:
    if (!users?.length) {
        return res.status(400).json({ message: 'Nie znaleziono użytkowników' })
    }

    res.json(users)
}

// @desc Stwórz nowego użytkownika
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {
    const { username, password, roles } = req.body

    // Weryfikacja i potwierdzenie danych
    if (!username || !password) {
        return res.status(400).json({ message: 'Wszystkie pola są wymagane' })
    }

    // Sprawdzenie zduplikowanych nazw użytkownika
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Zduplikowana nazwa użytkownika' })
    }

    // Hashowanie hasła
    const hashedPwd = await bcrypt.hash(password, 10)

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? { username, "password": hashedPwd }
        : { username, "password": hashedPwd, roles }

    // Stwórz i zapisz użytkownika
    const user = await User.create(userObject)

    if (user) { //stworzony
        res.status(201).json({ message: `Nowy użytkownik ${username} stworzony` })
    } else {
        res.status(400).json({ message: 'Otrzymano niewłaściwe dane' })
    }
}

// @desc Zaktualizuj użytkownika
// @route PATCH /users
// @access Private
const updateUser = async (req, res) => {
    const { id, username, roles, active, password } = req.body

    // Potwierdzenie i weryfikacja danych
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
        return res.status(400).json({ message: 'Wymagane są wszystkie pola, poza hasłem' })
    }

    // Czy użytkownik do aktualizacji istnieje?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'Nie znaleziono użytkownika' })
    }

    // Sprawdź zduplikowane nazwy użytkownika
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()

    // Zezwól na zmiany w oryginalnym użytkowniku
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Zduplikowana nazwa użytkownika' })
    }

    user.username = username
    user.roles = roles
    user.active = active

    if (password) {
        // haszowanie hasła
        user.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} zaktualizowany` })
}

// @desc Usuń użytkownika
// @route DELETE /users
// @access Private
const deleteUser = async (req, res) => {
    const { id } = req.body

    // Potwierdzenie danych
    if (!id) {
        return res.status(400).json({ message: 'Wymagane ID użytkownika' })
    }

    // Czy użytkownik ma przypisane notki?
    const note = await Note.findOne({ user: id }).lean().exec()
    if (note) {
        return res.status(400).json({ message: 'Użytkownik ma przypisane notki' +
                '' })
    }

    // Czy użytkownik istnieje i można go usunąć
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'Użytkownik nie został znaleziony' })
    }

    const result = await user.deleteOne()

    const reply = `Użytkownik ${result.username} z ID ${result._id} usunięty`

    res.json(reply)
}

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}