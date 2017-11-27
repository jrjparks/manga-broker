/// <reference types="mocha"/>
import { expect } from "chai";
import { ValueMapper } from "../src/ValueMapper";

describe("ValueMapper Tests", () => {
  it("should test ValueMapper()", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>();
    expect(mapper).to.be.ok;
    expect(mapper.keys).to.be.empty;
    expect(mapper.values).to.be.empty;
    done();
  });

  it("should test ValueMapper({})", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>({
      A: 0,
    });
    expect(mapper).to.be.ok;
    expect(mapper.keys).to.not.be.empty;
    expect(mapper.values).to.not.be.empty;
    expect(mapper.containsKey("A")).to.be.ok;
    expect(mapper.containsValue(0)).to.be.ok;
    done();
  });

  it("should test ValueMapper.keys", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>();
    expect(mapper).to.be.ok;
    expect(mapper.keys).to.be.empty;
    expect(mapper.values).to.be.empty;
    mapper.add("A", 0).add("B", 1);
    expect(mapper.keys).to.not.be.empty;
    expect(mapper.values).to.not.be.empty;
    expect(mapper.keys).to.have.members(["A", "B"]);
    expect(mapper.toValue("A")).to.equal(0);
    done();
  });

  it("should test ValueMapper.values", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>();
    expect(mapper).to.be.ok;
    mapper.add("A", 0).add("B", 1);
    expect(mapper.values).to.be.ok;
    expect(mapper.values).to.have.members([0, 1]);
    done();
  });

  it("should test ValueMapper.add", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>();
    expect(mapper).to.be.ok;
    expect(mapper.keys).to.be.empty;
    expect(mapper.values).to.be.empty;
    expect(mapper).to.be.ok;
    mapper.add("A", 0).add("B", 1);
    expect(mapper.containsKey("A")).to.be.ok;
    expect(mapper.containsValue(0)).to.be.ok;
    expect(mapper.toValue("A")).to.equal(0);
    expect(mapper.containsKey("B")).to.be.ok;
    expect(mapper.containsValue(1)).to.be.ok;
    expect(mapper.toValue("B")).to.equal(1);
    mapper.add("A", 2);
    expect(mapper.containsKey("A")).to.be.ok;
    expect(mapper.containsValue(2)).to.be.ok;
    expect(mapper.toValue("A")).to.equal(2);
    done();
  });

  it("should test ValueMapper.remove", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>({
      A: 0,
      B: 1,
    });
    expect(mapper).to.be.ok;
    expect(mapper.containsKey("A")).to.be.ok;
    expect(mapper.containsValue(0)).to.be.ok;
    expect(mapper.containsKey("B")).to.be.ok;
    expect(mapper.containsValue(1)).to.be.ok;

    mapper.remove("A", "B").remove("C");
    expect(mapper.containsKey("A")).to.not.be.ok;
    expect(mapper.containsValue(0)).to.not.be.ok;
    expect(mapper.containsKey("B")).to.not.be.ok;
    expect(mapper.containsValue(1)).to.not.be.ok;
    done();
  });

  it("should test ValueMapper.toValue", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>({
      A: 0,
      B: 1,
    });
    expect(mapper).to.be.ok;
    expect(mapper.toValue("A")).to.be.equal(0);
    expect(mapper.toValue("B")).to.be.equal(1);
    expect(mapper.toValue("C", "NO")).to.be.equal("NO");
    done();
  });

  it("should test ValueMapper.toKey", (done) => {
    const mapper: ValueMapper<any> = new ValueMapper<any>({
      A: 0,
      B: 1,
    });
    expect(mapper).to.be.ok;
    expect(mapper.toKey(0)).to.be.equal("A");
    expect(mapper.toKey(1)).to.be.equal("B");
    done();
  });
});
