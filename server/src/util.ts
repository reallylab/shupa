import { importSPKI, JWTPayload, jwtVerify } from "jose";
import { Result, ResultAsync } from "neverthrow";
import * as v from "valibot";

export const noThrow = <A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
) => {
  return ResultAsync.fromThrowable(fn, (e) => {
    if (e instanceof Error) {
      return e;
    }
    return new Error("unknown error");
  });
};

export const noThrowSync = <A extends unknown[], R>(fn: (...args: A) => R) => {
  return Result.fromThrowable(fn, (e) => {
    if (e instanceof Error) {
      return e;
    }
    return new Error("unknown error");
  });
};

export const verifyJWT = noThrow(
  async <T extends JWTPayload>(
    publicKey: string,
    jwtToken: string,
  ): Promise<T> => {
    const verifyToken = await importSPKI(publicKey, "Ed25519");
    const res = await jwtVerify(jwtToken, verifyToken);
    return res.payload as T;
  },
);

export const parseContent = noThrowSync(
  <S extends v.GenericSchema>(schema: S, data: unknown): v.InferOutput<S> => {
    const parseJson = v.safeParse(schema, data);
    if (!parseJson.success) {
      const path = parseJson.issues[0].path?.[0].key || "";
      const message = parseJson.issues[0].message;

      let error = message;
      if (path) {
        error = `${path} ~> ${error}`;
      }

      throw new Error(error);
    }
    return parseJson.output;
  },
);
