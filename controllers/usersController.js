const User = require('../models/User')
const Note = require('../models/Note')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')

// @desc    Get all users
// @route   GET /users
// @access  Private
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').lean()
    if(!users?.length) {
        return res.status(400).json({ message: 'Nie znaleziono użytkownika' })
    }
    res.json(users)
})

// @desc    Create new user
// @route   POST /users
// @access  Private
const createNewUser = asyncHandler(async (req, res) => {
    const { username, password, roles } = req.body

    // Potwierdź dane
    if(!username || !password || !Array.isArray(roles) || !roles.length) {
        return res.status(400).json({ message: 'Wymagane uzupełnienie wszystkich pól' })
    }

    // Sprawdzenie duplikatów
    const duplicate = await User.findOne ({ username }).lean().exec()

    if(duplicate) {
        return res.status(409).json({ message: 'Użytkownik o podanej nazwie już istnieje' })
    }

    //Haszowanie hasła
    const hashedPwd = await bcrypt.hash(password, 10) // 10 - salt rounds

    const userObject = { username, "password": hashedPwd, roles }

    // Tworzenie nowego użytkownika
    const user = await User.create(userObject)

    if (user) { // utworzono użytkownika
        return res.status(201).json({ message: `Użytkownik ${username} został utworzony` })
    } else {
        return res.status(400).json({ message: 'Nie udało się utworzyć użytkownika' })
    }
})

// @desc    Update a users
// @route   PATCH /users
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
    const { id, username, roles, active, password } = req.body

    // Potwierdź dane
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
        return res.status(400).json({ message: 'Wymagane uzupełnienie wszystkich pól' })
    }

    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'Nie znaleziono użytkownika' })
    }

    // Sprawdzenie duplikatów
    const duplicate = await User.findOne({ username }).lean().exec()

    // Dozwolone aktualizacje oryginalnego użytkownika
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Użytkownik o podanej nazwie już istnieje' })
    }

    user.username = username
    user.roles = roles
    user.active = active

    if (password) {
        // Haszowanie hasła
        user.password = await bcrypt.hash(password, 10) // 10 - salt rounds
    }

    const updatedUser = await user.save()

    res.json({ message: `Użytkownik ${updatedUser.username} został zaktualizowany` })
})

// @desc    Delete a user
// @route   DELETE /users
// @access  Private
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.body

    if (!id) {
        return res.status(400).json({ message: 'Nie podano ID użytkownika' })
    }

    const note = await Note.findOne({ user: id }).lean().exec()
    if (note) {
        return res.status(400).json({ message: 'Nie można usunąć użytkownika, który posiada przypisaną notkę' })
    }

    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'Nie znaleziono użytkownika' })
    }

    const result = await user.deleteOne()

    const reply = `Użytkownik ${result.username} o ID ${result._id} został usunięty`

    res.json(reply)
})

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}