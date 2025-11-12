export type ZodIssue = {
  path: (string | number)[];
  message: string;
};

export class ZodError extends Error {
  issues: ZodIssue[];

  constructor(issues: ZodIssue[]) {
    super(issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`).join('; '));
    this.issues = issues;
    this.name = 'ZodError';
  }
}

type Parser<T> = (value: unknown, path: (string | number)[]) => T;

class ZodType<T> {
  constructor(private readonly parser: Parser<T>) {}

  protected _parse(value: unknown, path: (string | number)[]): T {
    return this.parser(value, path);
  }

  parse(value: unknown): T {
    return this._parse(value, []);
  }

  safeParse(value: unknown): { success: true; data: T } | { success: false; error: ZodError } {
    try {
      const data = this.parse(value);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ZodError) {
        return { success: false, error };
      }
      throw error;
    }
  }

  optional(): ZodType<T | undefined> {
    return new ZodType<T | undefined>((value, path) => {
      if (value === undefined) return undefined;
      return this._parse(value, path);
    });
  }

  nullable(): ZodType<T | null> {
    return new ZodType<T | null>((value, path) => {
      if (value === null) return null;
      return this._parse(value, path);
    });
  }

  default(defaultValue: T): ZodType<T> {
    return new ZodType<T>((value, path) => {
      if (value === undefined) return defaultValue;
      return this._parse(value, path);
    });
  }

  transform<U>(fn: (value: T) => U): ZodType<U> {
    return new ZodType<U>((value, path) => {
      const parsed = this._parse(value, path);
      return fn(parsed);
    });
  }

  refine(check: (value: T) => boolean, message = 'Invalid value'): ZodType<T> {
    return new ZodType<T>((value, path) => {
      const parsed = this._parse(value, path);
      if (!check(parsed)) {
        throw new ZodError([{ path, message }]);
      }
      return parsed;
    });
  }
}

class ZodString extends ZodType<string> {
  constructor() {
    super((value, path) => {
      if (typeof value !== 'string') {
        throw new ZodError([{ path, message: 'Expected string' }]);
      }
      return value;
    });
  }

  min(minLength: number, message?: string): ZodString {
    return new ZodStringWrapper(this, (value, path) => {
      if (value.length < minLength) {
        throw new ZodError([{ path, message: message ?? `Expected at least ${minLength} characters` }]);
      }
      return value;
    });
  }

  max(maxLength: number, message?: string): ZodString {
    return new ZodStringWrapper(this, (value, path) => {
      if (value.length > maxLength) {
        throw new ZodError([{ path, message: message ?? `Expected at most ${maxLength} characters` }]);
      }
      return value;
    });
  }

  url(message = 'Invalid URL'): ZodString {
    return new ZodStringWrapper(this, (value, path) => {
      try {
        // eslint-disable-next-line no-new
        new URL(value);
        return value;
      } catch {
        throw new ZodError([{ path, message }]);
      }
    });
  }
}

class ZodStringWrapper extends ZodString {
  constructor(private readonly base: ZodString, private readonly validator: (value: string, path: (string | number)[]) => string) {
    super();
  }

  protected override _parse(value: unknown, path: (string | number)[]): string {
    const parsed = this.base['_parse'](value, path);
    return this.validator(parsed, path);
  }
}

class ZodNumber extends ZodType<number> {
  constructor(parser?: Parser<number>) {
    super(
      parser ?? ((value, path) => {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new ZodError([{ path, message: 'Expected number' }]);
        }
        return value;
      })
    );
  }

  int(message = 'Expected integer'): ZodNumber {
    return new ZodNumberWrapper(this, (value, path) => {
      if (!Number.isInteger(value)) {
        throw new ZodError([{ path, message }]);
      }
      return value;
    });
  }

  min(minValue: number, message?: string): ZodNumber {
    return new ZodNumberWrapper(this, (value, path) => {
      if (value < minValue) {
        throw new ZodError([{ path, message: message ?? `Expected number ≥ ${minValue}` }]);
      }
      return value;
    });
  }

  max(maxValue: number, message?: string): ZodNumber {
    return new ZodNumberWrapper(this, (value, path) => {
      if (value > maxValue) {
        throw new ZodError([{ path, message: message ?? `Expected number ≤ ${maxValue}` }]);
      }
      return value;
    });
  }
}

class ZodNumberWrapper extends ZodNumber {
  constructor(private readonly base: ZodNumber, private readonly validator: (value: number, path: (string | number)[]) => number) {
    super();
  }

  protected override _parse(value: unknown, path: (string | number)[]): number {
    const parsed = this.base['_parse'](value, path);
    return this.validator(parsed, path);
  }
}

class ZodBoolean extends ZodType<boolean> {
  constructor() {
    super((value, path) => {
      if (typeof value !== 'boolean') {
        throw new ZodError([{ path, message: 'Expected boolean' }]);
      }
      return value;
    });
  }
}

class ZodArray<T> extends ZodType<T[]> {
  constructor(private readonly itemSchema: ZodType<T>) {
    super((value, path) => {
      if (!Array.isArray(value)) {
        throw new ZodError([{ path, message: 'Expected array' }]);
      }
      const items: T[] = [];
      const issues: ZodIssue[] = [];
      value.forEach((item, index) => {
        try {
          items.push(this.itemSchema['_parse'](item, [...path, index]));
        } catch (error) {
          if (error instanceof ZodError) {
            issues.push(...error.issues);
          } else {
            throw error;
          }
        }
      });
      if (issues.length > 0) {
        throw new ZodError(issues);
      }
      return items;
    });
  }
}

type ZodShape = Record<string, ZodType<unknown>>;

type InferShape<S extends ZodShape> = {
  [K in keyof S]: S[K] extends ZodType<infer T> ? T : never;
};

class ZodObject<S extends ZodShape> extends ZodType<InferShape<S>> {
  constructor(private readonly shape: S) {
    super((value, path) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ZodError([{ path, message: 'Expected object' }]);
      }
      const result: Record<string, unknown> = {};
      const issues: ZodIssue[] = [];
      for (const key of Object.keys(this.shape)) {
        const schema = this.shape[key];
        const nextPath = [...path, key];
        try {
          const propertyValue = (value as Record<string, unknown>)[key];
          result[key] = schema['_parse'](propertyValue, nextPath);
        } catch (error) {
          if (error instanceof ZodError) {
            issues.push(...error.issues);
          } else {
            throw error;
          }
        }
      }
      if (issues.length > 0) {
        throw new ZodError(issues);
      }
      return result as InferShape<S>;
    });
  }
}

function string(): ZodString {
  return new ZodString();
}

function number(): ZodNumber {
  return new ZodNumber();
}

function boolean(): ZodBoolean {
  return new ZodBoolean();
}

function array<T>(schema: ZodType<T>): ZodArray<T> {
  return new ZodArray(schema);
}

function object<S extends ZodShape>(shape: S): ZodObject<S> {
  return new ZodObject(shape);
}

function enumeration<const Values extends readonly [string, ...string[]]>(values: Values): ZodType<Values[number]> {
  return new ZodType<Values[number]>((value, path) => {
    if (typeof value !== 'string') {
      throw new ZodError([{ path, message: 'Expected string' }]);
    }
    if (!values.includes(value)) {
      throw new ZodError([{ path, message: `Expected one of: ${values.join(', ')}` }]);
    }
    return value as Values[number];
  });
}

function preprocess<T>(preprocessor: (value: unknown) => unknown, schema: ZodType<T>): ZodType<T> {
  return new ZodType<T>((value, path) => {
    const processed = preprocessor(value);
    return schema['_parse'](processed, path);
  });
}

function literal<T extends string | number | boolean>(value: T): ZodType<T> {
  return new ZodType<T>((input, path) => {
    if (input !== value) {
      throw new ZodError([{ path, message: `Expected literal ${String(value)}` }]);
    }
    return value;
  });
}

const coerce = {
  number(): ZodNumber {
    return new ZodNumber((value, path) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          throw new ZodError([{ path, message: 'Expected number' }]);
        }
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      throw new ZodError([{ path, message: 'Expected number' }]);
    });
  }
};

export const z = Object.assign(
  {
    string,
    number,
    boolean,
    array,
    object,
    enum: enumeration,
    literal,
    preprocess,
    coerce
  },
  { ZodError }
);

export type infer<T extends ZodType<unknown>> = T extends ZodType<infer R> ? R : never;
