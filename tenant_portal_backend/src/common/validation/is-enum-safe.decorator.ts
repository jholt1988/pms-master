import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

type EnumGetter = () => Record<string, string | number> | undefined | null;

export function IsEnumSafe(getEnum: EnumGetter, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEnumSafe',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const enumObj = getEnum();
          if (!enumObj || value === undefined || value === null) {
            return false;
          }
          const allowed = Object.values(enumObj);
          return allowed.includes(value as string | number);
        },
        defaultMessage(args: ValidationArguments) {
          const enumObj = getEnum();
          const allowed = enumObj ? Object.values(enumObj).join(', ') : 'unknown';
          return `${args.property} must be one of: ${allowed}`;
        },
      },
    });
  };
}
