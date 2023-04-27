import * as constants from 'utils/app/const.ts';

export default function handler(req, res) {
  const { name } = req.query;
  const value = constants[name];
  if (value) {
    res.status(200).json({ [name]: value });
  } else {
    res.status(400).send(`Constant ${name} not found`);
  }
}
