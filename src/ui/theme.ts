export const FONT = {
  regular: 'Baloo2_500Medium',
  semibold: 'Baloo2_600SemiBold',
  bold: 'Baloo2_700Bold',
  heavy: 'Baloo2_800ExtraBold',
};

export const C = {
  paper: '#FBF4E8',
  paperDeep: '#F3E6D0',
  ink: '#5B4636',
  inkSoft: '#8C7663',
  outline: '#6E5444',
  wall: '#E9D5BD',
  wallTop: '#FFF6E6',
  wallFace: '#D6BC9E',
  shadow: 'rgba(110, 84, 68, 0.18)',
  safe: '#6DBE8C',
  warn: '#E8B44F',
  danger: '#E57C7C',
  button: '#F7A59B',
  buttonDeep: '#D9837A',
};

export interface BlobColor {
  id: string;
  name: string;
  body: string;
  shade: string;
}

export const BLOB_COLORS: BlobColor[] = [
  { id: 'peach', name: 'Peach', body: '#FFC4A8', shade: '#F29E7E' },
  { id: 'mint', name: 'Mint', body: '#B8EBCF', shade: '#86CFA8' },
  { id: 'sky', name: 'Sky', body: '#B9DDF7', shade: '#88BEE6' },
  { id: 'lilac', name: 'Lilac', body: '#D9C7F5', shade: '#B39CE0' },
  { id: 'butter', name: 'Butter', body: '#FCE9A4', shade: '#EDCB6A' },
  { id: 'rose', name: 'Rose', body: '#F9C6D8', shade: '#EC9DBB' },
  { id: 'seafoam', name: 'Seafoam', body: '#AEE6E0', shade: '#7ECBC2' },
  { id: 'cloud', name: 'Cloud', body: '#EEEAF2', shade: '#CEC6D8' },
];

export const blobColor = (id: string) => BLOB_COLORS.find((c) => c.id === id) ?? BLOB_COLORS[0];
