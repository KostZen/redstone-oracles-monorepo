import { beginCell, Builder, Cell, TupleBuilder, TupleReader } from "ton-core";
import { OP_NUMBER_BITS } from "./config/constants";
import { arrayify } from "ethers/lib/utils";
import { consts } from "@redstone-finance/protocol";

export function createTupleItems(
  items: (bigint | boolean | number | string)[]
) {
  const tuple = new TupleBuilder();

  items.forEach((value) => tuple.writeNumber(BigInt(value)));

  return tuple.build();
}

export function createArrayFromSerializedTuple(
  cell: Cell,
  value_size_bits: number = consts.DEFAULT_NUM_VALUE_BS * 8
) {
  let values: bigint[] = [];

  const slice = cell.beginParse();
  while (slice.remainingBits > 0) {
    const value = slice.loadUintBig(value_size_bits);
    values.push(value);
  }

  while (slice.remainingRefs > 0) {
    const c = slice.loadRef();
    values = values.concat(createArrayFromSerializedTuple(c));
  }

  return values;
}

export function messageBuilder(opNumber: bigint): Builder {
  return beginCell().storeUint(opNumber, OP_NUMBER_BITS);
}

export function createArrayFromTuple(result: TupleReader) {
  const values: bigint[] = [];
  while (result.remaining) {
    values.push(result.readBigNumber());
  }

  return values;
}

export function createBuilderFromString(value: string) {
  return beginCell().storeBuffer(
    Buffer.from(arrayify(value.startsWith("0x") ? value : "0x" + value))
  );
}
