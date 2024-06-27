import bcrypt from "bcrypt";

const saltRounds = 10;

export const hashPassword = (password) => {
    const salt = bcrypt.genSaltSync(saltRounds)
    console.log(salt);
    return bcrypt.hashSync(password, salt);
};


export const comparePassword = (plain, hashed) => {
    return bcrypt.compareSync(plain, hashed);
};


export const generateOTP = () => {
    // Generate a random 6-digit number
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString(); // Convert the number to a string
}