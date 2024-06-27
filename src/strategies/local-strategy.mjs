import passport from 'passport';
import { Strategy } from 'passport-local';
import { User } from "../mongoose/schemas/user.mjs";
import { comparePassword } from '../utils/helpers.mjs';

passport.serializeUser((user, done) => {
    console.log(`Inside Serialize User`);
    console.log(user);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    console.log(`Inside Deserializer`);
    console.log(`Deserializing User ID ${id}`)
    try {
        const findUser = await User.findById(id);
        if (!findUser) throw new Error("User Not Found");
        done(null, findUser);
    } catch (err) {
        done(err, null);
    }
});

export default passport.use(
    new Strategy({ usernameField: "email"}, async(email, password, done) => {
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        try {
            const findUser = await User.findOne({ email: email.toLowerCase() }); // Convert email to lowercase
            if (!findUser) throw new Error("Email not found");
            if (!comparePassword(password, findUser.password)) throw new Error("Password Incorrect");
            done(null, findUser);
        } catch(err){
            done(err, null);
        }
    })
);
