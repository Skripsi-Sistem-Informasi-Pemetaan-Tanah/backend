import { body, validationResult } from "express-validator"

export const runValidation = (req, res, next)=> {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(404).json({
            status: false,
            message: errors.array()[0].msg
        })
    }
    next()
}

export const validationRegister = [
    // check('email').matchedData('/.+\@.+\..+/').message('Format Email salah')
    body('email', 'Email tidak boleh kosong').notEmpty().isEmail().withMessage('Email tidak valid'),
    body('username', 'Username tidak boleh kosong').notEmpty(),
    body('password', 'Password tidak boleh kosong').notEmpty(),
    //body('nama', 'Nama tidak boleh kosong').notEmpty()
]
