import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

type EnumLike = Record<string, string | number> | undefined | null;
type EnumGetter = () => EnumLike;

export function IsEnumSafe(enumOrGetter: EnumLike | EnumGetter, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEnumSafe',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const enumObj = typeof enumOrGetter === 'function' ? (enumOrGetter as EnumGetter)() : enumOrGetter;
          if (!enumObj || value === undefined || value === null) {
            return false;
          }
          const allowed = Object.values(enumObj);
          return allowed.includes(value as string | number);
        },
        defaultMessage(args: ValidationArguments) {
          const enumObj = typeof enumOrGetter === 'function' ? (enumOrGetter as EnumGetter)() : enumOrGetter;
          const allowed = enumObj ? Object.values(enumObj).join(', ') : 'unknown';
          return `${args.property} must be one of: ${allowed}`;
        },
      },
    });
  };
}
