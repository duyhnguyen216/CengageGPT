import * as constants from 'utils/app/const.ts';

export default function handler(req, res) {
  const { name } = req.query;
  console.log('name ' + name);
  const value = constants[name];
  console.log('value ' + value);
  if (value) {
    res.status(200).json({ [name]: value });
  } else {
    res.status(400).send(`Constant ${name} not found`);
  }
}
